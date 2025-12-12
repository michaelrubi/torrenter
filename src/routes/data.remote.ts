import { query } from '$app/server';
// CHANGE THIS LINE: Use dynamic private env
import { env } from '$env/dynamic/private';
import * as v from 'valibot';

import type { Torrent } from '$lib/types';

export const searchTorrents = query(v.string(), async (searchTerm: string) => {
    if (!searchTerm) return [];

    // UPDATE USAGE: Access variables via 'env.'
    const apiKey = env.JACKETT_API_KEY;
    const jackettUrl = env.JACKETT_URL;

    const limit = 1000;
    // Update the URL string interpolation
    const apiUrl = `${jackettUrl}/api/v2.0/indexers/all/results?query=${encodeURIComponent(searchTerm)}&apikey=${apiKey}&limit=${limit}`;

    try {
        // ... rest of your code remains the same
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`Jackett API error: ${response.status} ${response.statusText}`);
            throw new Error(`Jackett API responded with ${response.status}`);
        }

        const data = await response.json();

        // The response is an array of objects, each containing a "Results" array.
        // We flatten them to get a single list of results.
        const results: Torrent[] = data.Results.filter((result: any) => !result.CategoryDesc.toLowerCase().includes('xxx')).map((result: any) => {
            const { Title: title, MagnetUri: magnet, Seeders: seeds, Peers: peers, Size, PublishDate, Tracker: tracker } = result;

            const size = ((bytes = Size, decimals = 2) => {
                if (bytes === 0) return '0 Bytes';

                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

                const i = Math.floor(Math.log(bytes) / Math.log(k));

                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            })()

            const date = new Date(PublishDate).toLocaleDateString();
            return {
                title,
                magnet,
                seeds,
                peers,
                size,
                sizeBytes: Size,
                date,
                publishDate: PublishDate,
                tracker
            };
        });

        return results;

    } catch (error) {
        console.error('Search error:', error);
        throw new Error('Failed to fetch results');
    }
});



export const getDiscoveryContent = query(v.object({
    page: v.optional(v.number(), 1),
    mediaType: v.optional(v.picklist(['movie', 'tv']), 'movie')
}), async ({ page = 1, mediaType = 'movie' }: { page?: number, mediaType?: 'movie' | 'tv' }) => {
    const apiKey = env.TMDB_API_KEY;
    if (!apiKey) {
        throw new Error('TMDB_API_KEY is not set');
    }

    const url = new URL(`https://api.themoviedb.org/3/discover/${mediaType}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('sort_by', 'popularity.desc');
    url.searchParams.set('watch_region', 'US');
    url.searchParams.set('with_watch_monetization_types', 'flatrate|rent|buy');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('page', page.toString());

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`TMDB API responded with ${response.status}`);
        }

        const data = await response.json();

        return data.results.map((item: any) => ({
            id: item.id,
            title: item.title || item.name, // generic title for movies, name for tv
            posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
            releaseDate: item.release_date || item.first_air_date, // release_date for movies, first_air_date for tv
            overview: item.overview,
            mediaType: mediaType
        }));

    } catch (error) {
        console.error('Discovery error:', error);
        return [];
    }
});

