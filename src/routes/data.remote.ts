import { query } from '$app/server';
import { JACKETT_API_KEY, JACKETT_URL } from '$env/static/private';
import * as v from 'valibot';

import type { Torrent } from '$lib/types';

export const searchTorrents = query(v.string(), async (searchTerm: string) => {
    if (!searchTerm) return [];

    const limit = 1000;
    const apiUrl = `${JACKETT_URL}/api/v2.0/indexers/all/results?query=${encodeURIComponent(searchTerm)}&apikey=${JACKETT_API_KEY}&limit=${limit}`;

    try {
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
