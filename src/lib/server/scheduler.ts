import type PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { getServerClient } from './pocketbase';
import { fromDownloadUrl, searchJackett, toJackettDownloadUrl } from './jackett';
import { isStale, nextEpisodeToGrab, refreshShow } from './shows';
import { extractTags, parseMediaInfo } from '$lib/utils/title-parser';
import type { ShowQuality, Torrent, TrackedShow } from '$lib/types';

const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 30 * 1000;
// Bounds how far one run catches a show up, so a long backlog can't flood Transmission.
const MAX_EPISODES_PER_SHOW = 5;

const pad = (n: number) => String(n).padStart(2, '0');
const normalise = (s: string) =>
	s
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

const RESOLUTION_TAG: Record<Exclude<ShowQuality, 'any'>, string> = {
	'720p': '720p',
	'1080p': '1080p',
	'2160p': '4K'
};

export function pickRelease(
	torrents: Torrent[],
	showName: string,
	season: number,
	episode: number,
	quality: ShowQuality | ''
): Torrent | null {
	// Matches S01E02 but not S01E02-E03 packs or S01E020.
	const episodeTag = new RegExp(`\\bS0?${season}E0?${episode}(?![0-9]|-?E\\d)`, 'i');
	const wantedName = normalise(showName);

	const candidates = torrents.filter((t) => {
		if (t.seeds < 1 || (!t.magnet && !t.downloadUrl)) return false;
		if (!episodeTag.test(t.title)) return false;
		const info = parseMediaInfo(t.title);
		if (!info || normalise(info.name) !== wantedName) return false;
		if (quality && quality !== 'any') {
			return extractTags(t.title).Resolution.includes(RESOLUTION_TAG[quality]);
		}
		return true;
	});

	return candidates.sort((a, b) => b.seeds - a.seeds)[0] ?? null;
}

async function queueRelease(
	pb: PocketBase,
	show: TrackedShow,
	season: number,
	episode: number,
	release: Torrent,
	jackett: { url: string; apiKey: string }
) {
	const form = new FormData();
	form.set('user', show.user);
	form.set('show', show.id);
	form.set('season', String(season));
	form.set('episode', String(episode));
	form.set('title', `${show.name} S${pad(season)}E${pad(episode)}`);
	form.set('release_title', release.title);
	form.set('status', 'queued');

	if (release.magnet) {
		form.set('magnet', release.magnet);
	} else {
		// The download machine can't reach Jackett, so the .torrent travels inside the job.
		const params = fromDownloadUrl(release.downloadUrl);
		if (!params) throw new Error('Release has no usable link');
		const res = await fetch(toJackettDownloadUrl(jackett.url, jackett.apiKey, params), {
			redirect: 'manual'
		});
		const location = res.headers.get('location');
		if (location?.startsWith('magnet:')) {
			form.set('magnet', location);
		} else if (res.ok) {
			form.set('torrent', new File([await res.blob()], `${params.file}.torrent`));
		} else {
			throw new Error(`Jackett returned ${res.status} for the torrent file`);
		}
	}

	await pb.collection('downloads').create(form);
	await pb
		.collection('shows')
		.update(show.id, { last_grabbed_season: season, last_grabbed_episode: episode });
}

async function processShow(
	pb: PocketBase,
	show: TrackedShow,
	jackett: { url: string; apiKey: string }
) {
	if (isStale(show)) show = await refreshShow(pb, show);

	for (let i = 0; i < MAX_EPISODES_PER_SHOW; i++) {
		const target = nextEpisodeToGrab(show);
		if (!target) return;

		const query = `${show.name} S${pad(target.season)}E${pad(target.episode)}`;
		const release = pickRelease(
			await searchJackett(jackett.url, jackett.apiKey, query),
			show.name,
			target.season,
			target.episode,
			show.quality
		);
		if (!release) {
			console.info(`[scheduler] No release yet for ${query}`);
			return;
		}

		await queueRelease(pb, show, target.season, target.episode, release, jackett);
		console.info(`[scheduler] Queued ${query}: ${release.title}`);
		show = {
			...show,
			last_grabbed_season: target.season,
			last_grabbed_episode: target.episode
		};
	}
}

let running = false;

export async function runScheduler() {
	if (running) return;
	running = true;
	try {
		const jackettUrl = env.JACKETT_URL;
		const apiKey = env.JACKETT_API_KEY;
		const pb = await getServerClient();
		if (!pb || !jackettUrl || !apiKey) return;

		const shows = await pb
			.collection('shows')
			.getFullList<TrackedShow>({ filter: 'auto_download = true' });

		for (const show of shows) {
			try {
				await processShow(pb, show, { url: jackettUrl, apiKey });
			} catch (err) {
				console.error(`[scheduler] ${show.name} failed:`, err);
			}
		}
	} catch (err) {
		console.error('[scheduler] Run failed:', err);
	} finally {
		running = false;
	}
}

let started = false;

export function startScheduler() {
	if (started || building) return;
	if (!env.PB_SERVER_EMAIL || !env.PB_SERVER_PASSWORD) {
		console.info('[scheduler] PB_SERVER_EMAIL/PASSWORD not set; auto-download is off');
		return;
	}
	started = true;
	setTimeout(runScheduler, FIRST_RUN_DELAY_MS);
	setInterval(runScheduler, INTERVAL_MS);
}
