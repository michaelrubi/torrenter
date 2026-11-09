import type PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { TrackedShow } from '$lib/types';

interface TmdbEpisode {
	season_number: number;
	episode_number: number;
	name?: string;
	air_date?: string | null;
}

export interface ShowSchedule {
	name: string;
	poster_path: string;
	status: string;
	next_season: number | null;
	next_episode: number | null;
	next_episode_name: string;
	next_air_date: string;
	last_season: number | null;
	last_episode: number | null;
	last_air_date: string;
}

// Schedules rarely change within a day, so a record is only refetched once it is this old.
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

// PocketBase stores dates as "YYYY-MM-DD HH:MM:SS.sssZ"; TMDB air dates are bare days.
const toPbDate = (day?: string | null) => (day ? `${day} 00:00:00.000Z` : '');

export async function fetchShowSchedule(tmdbId: number): Promise<ShowSchedule> {
	const apiKey = env.TMDB_API_KEY;
	if (!apiKey) throw new Error('TMDB_API_KEY is not set');

	const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`);
	if (!res.ok) throw new Error(`TMDB API responded with ${res.status}`);
	const data = await res.json();
	const next = data.next_episode_to_air as TmdbEpisode | null;
	const last = data.last_episode_to_air as TmdbEpisode | null;

	return {
		name: data.name || 'Untitled',
		poster_path: data.poster_path || '',
		status: data.status || '',
		next_season: next?.season_number ?? null,
		next_episode: next?.episode_number ?? null,
		next_episode_name: next?.name || '',
		next_air_date: toPbDate(next?.air_date),
		last_season: last?.season_number ?? null,
		last_episode: last?.episode_number ?? null,
		last_air_date: toPbDate(last?.air_date)
	};
}

export function isStale(show: Pick<TrackedShow, 'last_synced'>, now = Date.now()): boolean {
	if (!show.last_synced) return true;
	return now - new Date(show.last_synced).getTime() > STALE_AFTER_MS;
}

export async function refreshShow(pb: PocketBase, show: TrackedShow): Promise<TrackedShow> {
	const schedule = await fetchShowSchedule(show.tmdb_id);
	return pb
		.collection('shows')
		.update<TrackedShow>(show.id, { ...schedule, last_synced: new Date().toISOString() });
}

// Picks the one episode after the last grabbed one, as long as TMDB says it has aired.
// A season rollover is assumed once TMDB's latest aired episode is in a later season.
export function nextEpisodeToGrab(
	show: Pick<
		TrackedShow,
		'last_grabbed_season' | 'last_grabbed_episode' | 'last_season' | 'last_episode'
	>
): { season: number; episode: number } | null {
	const lastSeason = show.last_season ?? 0;
	const lastEpisode = show.last_episode ?? 0;
	if (!lastSeason || !lastEpisode) return null;

	const grabbedSeason = show.last_grabbed_season ?? 0;
	const grabbedEpisode = show.last_grabbed_episode ?? 0;

	if (grabbedSeason === lastSeason) {
		return grabbedEpisode < lastEpisode
			? { season: lastSeason, episode: grabbedEpisode + 1 }
			: null;
	}
	if (grabbedSeason < lastSeason) {
		return { season: grabbedSeason + 1, episode: 1 };
	}
	return null;
}
