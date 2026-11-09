import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { fetchShowSchedule, isStale, refreshShow } from '$lib/server/shows';
import type { DownloadJob, TrackedShow } from '$lib/types';

function requireUser() {
	const { locals } = getRequestEvent();
	if (!locals.pb || !locals.user) error(401, 'Sign in to use the watchlist.');
	return { pb: locals.pb, user: locals.user };
}

export const getWatchlist = query(async () => {
	const { pb } = requireUser();
	let shows = await pb.collection('shows').getFullList<TrackedShow>({ sort: 'name' });

	// Refresh stale schedules here too, so the page is current even with the scheduler off.
	shows = await Promise.all(
		shows.map((show) =>
			isStale(show)
				? refreshShow(pb, show).catch((err) => {
						console.warn(`Schedule refresh failed for ${show.name}:`, err);
						return show;
					})
				: show
		)
	);

	const downloads = await pb
		.collection('downloads')
		.getList<DownloadJob>(1, 30, { sort: '-created' });

	return { shows, downloads: downloads.items };
});

// The modal asks whether a show is tracked; signed-out visitors just get "no".
export const getTrackedShow = query(v.number(), async (tmdbId) => {
	const { locals } = getRequestEvent();
	if (!locals.pb || !locals.user) return null;
	const items = await locals.pb
		.collection('shows')
		.getList<TrackedShow>(1, 1, { filter: locals.pb.filter('tmdb_id = {:id}', { id: tmdbId }) });
	return items.items[0] ?? null;
});

export const trackShow = command(v.number(), async (tmdbId) => {
	const { pb, user } = requireUser();
	const schedule = await fetchShowSchedule(tmdbId);
	// Starting from the latest aired episode means tracking never downloads the back catalogue.
	const show = await pb.collection('shows').create<TrackedShow>({
		user: user.id,
		tmdb_id: tmdbId,
		...schedule,
		last_synced: new Date().toISOString(),
		auto_download: false,
		quality: '1080p',
		last_grabbed_season: schedule.last_season,
		last_grabbed_episode: schedule.last_episode
	});
	getTrackedShow(tmdbId).set(show);
	return show;
});

export const untrackShow = command(v.string(), async (id) => {
	const { pb } = requireUser();
	const show = await pb.collection('shows').getOne<TrackedShow>(id);
	await pb.collection('shows').delete(id);
	getTrackedShow(show.tmdb_id).set(null);
	getWatchlist().refresh();
});

export const updateShowSettings = command(
	v.object({
		id: v.string(),
		auto_download: v.optional(v.boolean()),
		quality: v.optional(v.picklist(['any', '720p', '1080p', '2160p']))
	}),
	async ({ id, ...changes }) => {
		const { pb } = requireUser();
		const show = await pb.collection('shows').update<TrackedShow>(id, changes);
		getTrackedShow(show.tmdb_id).set(show);
		getWatchlist().refresh();
		return show;
	}
);

export const retryDownload = command(v.string(), async (id) => {
	const { pb } = requireUser();
	await pb.collection('downloads').update(id, { status: 'queued', error: '' });
	getWatchlist().refresh();
});
