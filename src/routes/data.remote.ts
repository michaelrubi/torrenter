import { query } from '$app/server';
import { env } from '$env/dynamic/private';
import * as v from 'valibot';

import type { Torrent, DiscoveryItem, MediaDetails } from '$lib/types';

export const searchTorrents = query(v.string(), async (searchTerm: string) => {
	if (!searchTerm) return [];

	const apiKey = env.JACKETT_API_KEY;
	const jackettUrl = env.JACKETT_URL;

	if (!apiKey || !jackettUrl) {
		console.warn('JACKETT_API_KEY or JACKETT_URL not set');
		return [];
	}

	const limit = 1000;
	const apiUrl = `${jackettUrl}/api/v2.0/indexers/all/results?query=${encodeURIComponent(searchTerm)}&apikey=${apiKey}&limit=${limit}`;

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			console.error(`Jackett API error: ${response.status} ${response.statusText}`);
			throw new Error(`Jackett API responded with ${response.status}`);
		}

		const data = await response.json();

		const results: Torrent[] = (data.Results || [])
			.filter((result: any) => !result.CategoryDesc?.toLowerCase().includes('xxx'))
			.map((result: any) => {
				const { Title: title, MagnetUri: magnet, Seeders: seeds, Peers: peers, Size, PublishDate, Tracker: tracker } = result;

				const size = ((bytes = Size, decimals = 2) => {
					if (!bytes || bytes === 0) return '0 Bytes';
					const k = 1024;
					const dm = decimals < 0 ? 0 : decimals;
					const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
					const i = Math.floor(Math.log(bytes) / Math.log(k));
					return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
				})();

				const date = PublishDate ? new Date(PublishDate).toLocaleDateString() : '';
				return {
					title,
					magnet: magnet || '',
					seeds: seeds || 0,
					peers: peers || 0,
					size,
					sizeBytes: Size || 0,
					date,
					publishDate: PublishDate || '',
					tracker: tracker || 'Unknown'
				};
			});

		return results;
	} catch (error) {
		console.error('Search error:', error);
		throw new Error('Failed to fetch results');
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

			return (data.results || []).map((item: any) => ({
				id: item.id,
				title: item.title || item.name || 'Untitled',
				posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
				backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
				releaseDate: item.release_date || item.first_air_date || '',
				overview: item.overview || '',
				mediaType: mediaType,
				voteAverage: item.vote_average ? Math.round(item.vote_average * 10) / 10 : undefined,
				voteCount: item.vote_count || 0
			}));
		} catch (error) {
			console.error('Discovery error:', error);
			return [];
		}
	}
);

export const getMediaDetails = query(
	v.object({
		id: v.number(),
		mediaType: v.picklist(['movie', 'tv'])
	}),
	async ({ id, mediaType }: { id: number; mediaType: 'movie' | 'tv' }): Promise<MediaDetails | null> => {
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
							imdbRating = omdbData.imdbRating && omdbData.imdbRating !== 'N/A' ? `${omdbData.imdbRating}/10` : undefined;
							const rtRating = omdbData.Ratings?.find((r: any) => r.Source === 'Rotten Tomatoes');
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
			const trailerObj = data.videos?.results?.find(
				(v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
			);

			return {
				id: data.id,
				title: data.title || data.name || 'Untitled',
				posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
				backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '',
				releaseDate: data.release_date || data.first_air_date || '',
				overview: data.overview || '',
				mediaType: mediaType,
				voteAverage: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0,
				voteCount: data.vote_count || 0,
				genres: data.genres ? data.genres.map((g: any) => g.name) : [],
				runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : undefined),
				tagline: data.tagline || '',
				imdbId,
				imdbRating: imdbRating || (data.vote_average ? `${Math.round(data.vote_average * 10) / 10}/10` : undefined),
				rottenTomatoesScore,
				trailerKey: trailerObj?.key
			};
		} catch (error) {
			console.error('getMediaDetails error:', error);
			return null;
		}
	}
);
