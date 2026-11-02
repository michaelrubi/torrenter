import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { toJackettDownloadUrl } from '$lib/server/jackett';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const tracker = url.searchParams.get('tracker');
	const path = url.searchParams.get('path');
	const file = url.searchParams.get('file');
	if (!tracker || !path || !file) error(400, 'Missing download parameters');

	const apiKey = env.JACKETT_API_KEY;
	const jackettUrl = env.JACKETT_URL;
	if (!apiKey || !jackettUrl) {
		error(503, 'Jackett indexer is not configured (missing JACKETT_URL or JACKETT_API_KEY)');
	}

	let response: Response;
	try {
		// Some indexers answer with a redirect to a magnet, which fetch cannot follow.
		response = await fetch(toJackettDownloadUrl(jackettUrl, apiKey, { tracker, path, file }), {
			redirect: 'manual'
		});
	} catch (err) {
		console.error('Download error:', err);
		error(502, 'Unable to reach the Jackett indexer. Check its status and try again.');
	}

	const location = response.headers.get('location');
	if (location?.startsWith('magnet:')) {
		return new Response(null, { status: 302, headers: { location } });
	}

	if (!response.ok) {
		console.error(`Jackett download error: ${response.status} ${response.statusText}`);
		error(502, 'Jackett could not fetch this torrent file.');
	}

	const filename = file.replace(/[^\w. -]/g, '_');
	return new Response(response.body, {
		headers: {
			'content-type': 'application/x-bittorrent',
			'content-disposition': `attachment; filename="${filename}.torrent"`
		}
	});
};
