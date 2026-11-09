import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as v from 'valibot';

import { searchJackett } from '$lib/server/jackett';
import type { DiscoveryItem, MediaDetails } from '$lib/types';

interface TmdbDiscoverRawItem {
	id: number;
	title?: string;
	name?: string;
	poster_path?: string;
	backdrop_path?: string;
	release_date?: string;
	first_air_date?: string;
	overview?: string;
	vote_average?: number;
	vote_count?: number;
}

export const searchTorrents = query(v.string(), async (searchTerm: string) => {
	if (!searchTerm) return [];

	const apiKey = env.JACKETT_API_KEY;
	const jackettUrl = env.JACKETT_URL;

	if (!apiKey || !jackettUrl) {
		console.warn('JACKETT_API_KEY or JACKETT_URL not set');
		error(503, 'Jackett indexer is not configured (missing JACKETT_URL or JACKETT_API_KEY)');
	}

	try {
		return await searchJackett(jackettUrl, apiKey, searchTerm);
	} catch (err) {
		console.error('Search error:', err);
		error(502, 'Unable to reach the Jackett indexer. Check its status and try again.');
	}
});

export const getDiscoveryContent = query(
	v.object({
		page: v.optional(v.number(), 1),
		mediaType: v.optional(v.picklist(['movie', 'tv']), 'movie')
	}),
	async ({ page = 1, mediaType = 'movie' }: { page?: number; mediaType?: 'movie' | 'tv' }) => {
		const apiKey = env.TMDB_API_KEY;
		if (!apiKey) {
			console.warn('TMDB_API_KEY is not set');
			return [];
		}

		const url = new URL(`https://api.themoviedb.org/3/discover/${mediaType}`);
		url.searchParams.set('api_key', apiKey);
		url.searchParams.set('sort_by', 'popularity.desc');
		url.searchParams.set('include_adult', 'false');
		url.searchParams.set('language', 'en-US');
		url.searchParams.set('page', page.toString());

		try {
			const response = await fetch(url.toString());

			if (!response.ok) {
				throw new Error(`TMDB API responded with ${response.status}`);
			}

			const data = await response.json();

			return ((data.results || []) as TmdbDiscoverRawItem[]).map((item): DiscoveryItem => ({
				id: item.id,
				title: item.title || item.name || 'Untitled',
				posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
				backdropPath: item.backdrop_path
					? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
					: '',
				releaseDate: item.release_date || item.first_air_date || '',
				overview: item.overview || '',
				mediaType: mediaType,
				voteAverage: item.vote_average ? Math.round(item.vote_average * 10) / 10 : undefined,
				voteCount: item.vote_count || 0
			}));
		} catch (error) {
			console.error('Discovery error:', error);
			throw new Error('Failed to load discovery content');
		}
	}
);

export const getMediaDetails = query(
	v.object({
		id: v.number(),
		mediaType: v.picklist(['movie', 'tv'])
	}),
	async ({
		id,
		mediaType
	}: {
		id: number;
		mediaType: 'movie' | 'tv';
	}): Promise<MediaDetails | null> => {
		const apiKey = env.TMDB_API_KEY;
		if (!apiKey) return null;

		try {
			const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&append_to_response=external_ids,videos`;
			const res = await fetch(url);
			if (!res.ok) return null;
			const data = await res.json();

			const imdbId = data.external_ids?.imdb_id || data.imdb_id;
			let imdbRating: string | undefined = undefined;
			let rottenTomatoesScore: string | undefined = undefined;

			// Optional OMDb fetch if OMDB_API_KEY is available
			const omdbKey = env.OMDB_API_KEY;
			if (omdbKey && imdbId) {
				try {
					const omdbRes = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`);
					if (omdbRes.ok) {
						const omdbData = await omdbRes.json();
						if (omdbData.Response === 'True') {
							imdbRating =
								omdbData.imdbRating && omdbData.imdbRating !== 'N/A'
									? `${omdbData.imdbRating}/10`
									: undefined;
							const rtRating = (
								omdbData.Ratings as { Source?: string; Value?: string }[] | undefined
							)?.find((r) => r.Source === 'Rotten Tomatoes');
							if (rtRating) {
								rottenTomatoesScore = rtRating.Value;
							}
						}
					}
				} catch (e) {
					console.warn('OMDb fetch failed:', e);
				}
			}

			// Find trailer key
			const trailerObj = (
				data.videos?.results as { site?: string; type?: string; key?: string }[] | undefined
			)?.find((vid) => vid.site === 'YouTube' && (vid.type === 'Trailer' || vid.type === 'Teaser'));

			return {
				id: data.id,
				title: data.title || data.name || 'Untitled',
				posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
				backdropPath: data.backdrop_path
					? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
					: '',
				releaseDate: data.release_date || data.first_air_date || '',
				overview: data.overview || '',
				mediaType: mediaType,
				voteAverage: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0,
				voteCount: data.vote_count || 0,
				genres: data.genres ? (data.genres as { name: string }[]).map((g) => g.name) : [],
				runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : undefined),
				tagline: data.tagline || '',
				imdbId,
				imdbRating:
					imdbRating ||
					(data.vote_average ? `${Math.round(data.vote_average * 10) / 10}/10` : undefined),
				rottenTomatoesScore,
				trailerKey: trailerObj?.key
			};
		} catch (error) {
			console.error('getMediaDetails error:', error);
			return null;
		}
	}
);

interface TmdbSearchRawItem {
	id: number;
	media_type?: string;
	poster_path?: string | null;
	release_date?: string;
	first_air_date?: string;
	popularity?: number;
}

// Many releases share a film or season, so posters are kept for the life of the server.
const posterCache = new Map<string, Promise<string>>();

async function tmdbJson(path: string, params: Record<string, string>, apiKey: string) {
	const url = new URL(`https://api.themoviedb.org/3/${path}`);
	url.searchParams.set('api_key', apiKey);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	const response = await fetch(url);
	if (!response.ok) throw new Error(`TMDB API responded with ${response.status}`);
	return response.json();
}

async function findPoster(
	{ name, year, season }: { name: string; year?: number; season?: number },
	apiKey: string
): Promise<string> {
	const data = await tmdbJson(
		season ? 'search/tv' : 'search/multi',
		{ query: name, include_adult: 'false' },
		apiKey
	);
	const candidates = ((data.results || []) as TmdbSearchRawItem[]).filter(
		(item) => season || item.media_type === 'movie' || item.media_type === 'tv'
	);
	const yearOf = (item: TmdbSearchRawItem) =>
		parseInt((item.release_date || item.first_air_date || '').slice(0, 4), 10);
	const match =
		(year && candidates.find((item) => yearOf(item) === year)) || candidates[0] || undefined;
	if (!match) return '';

	let posterPath = match.poster_path;
	if (season) {
		try {
			const seasonData = await tmdbJson(`tv/${match.id}/season/${season}`, {}, apiKey);
			posterPath = seasonData.poster_path || posterPath;
		} catch {
			// Fall back to the show's poster.
		}
	}
	return posterPath ? `https://image.tmdb.org/t/p/w154${posterPath}` : '';
}

const posterInput = v.object({
	name: v.string(),
	year: v.optional(v.number()),
	season: v.optional(v.number())
});

// A plain query rather than query.batch: batches are POSTs, which SvelteKit rejects as
// cross-site when the server's ORIGIN isn't configured, while GETs always get through.
export const getPoster = query(posterInput, async (input) => {
	const apiKey = env.TMDB_API_KEY;
	if (!apiKey) return '';

	const key = `${input.name.toLowerCase()}|${input.year ?? ''}|${input.season ?? ''}`;
	let poster = posterCache.get(key);
	if (!poster) {
		poster = findPoster(input, apiKey).catch((err) => {
			console.warn('Poster lookup failed:', err);
			posterCache.delete(key);
			return '';
		});
		posterCache.set(key, poster);
	}
	return poster;
});
