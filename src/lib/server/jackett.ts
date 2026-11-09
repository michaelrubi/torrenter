import type { Torrent } from '$lib/types';

export interface JackettRawResult {
	CategoryDesc?: string;
	Title: string;
	MagnetUri?: string | null;
	Link?: string | null;
	InfoHash?: string | null;
	Seeders?: number;
	Peers?: number;
	Size?: number;
	PublishDate?: string;
	Tracker?: string;
}

export interface DownloadParams {
	tracker: string;
	path: string;
	file: string;
}

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32ToHex(value: string): string {
	const bits = [...value.toLowerCase()]
		.map((char) => BASE32_ALPHABET.indexOf(char).toString(2).padStart(5, '0'))
		.join('');
	return (bits.match(/.{4}/g) ?? []).map((nibble) => parseInt(nibble, 2).toString(16)).join('');
}

// Magnets carry the hash as 40 hex or 32 base32 characters; both name the same torrent.
export function getInfoHash(magnet: string, infoHash?: string | null): string | null {
	const hash = infoHash || magnet.match(/xt=urn:btih:([a-z0-9]+)/i)?.[1];
	if (!hash) return null;
	if (/^[0-9a-f]{40}$/i.test(hash)) return hash.toLowerCase();
	if (/^[a-z2-7]{32}$/i.test(hash)) return base32ToHex(hash);
	return null;
}

// Jackett's links embed its API key, so the browser gets a same-origin link holding
// only the parts /download needs to rebuild the request.
export function toDownloadUrl(link: string | null | undefined): string {
	if (!link) return '';

	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return '';
	}

	const tracker = url.pathname.match(/\/dl\/([^/]+)\/?$/)?.[1];
	const path = url.searchParams.get('path');
	const file = url.searchParams.get('file');
	if (!tracker || !path || !file) return '';

	const params = new URLSearchParams({ tracker: decodeURIComponent(tracker), path, file });
	return `/download?${params}`;
}

// Always targets the configured Jackett, so a crafted /download link cannot reach
// any other host.
export function toJackettDownloadUrl(
	jackettUrl: string,
	apiKey: string,
	{ tracker, path, file }: DownloadParams
): string {
	const params = new URLSearchParams({ jackett_apikey: apiKey, path, file });
	return `${jackettUrl}/dl/${encodeURIComponent(tracker)}/?${params}`;
}

export function mergeDuplicates(torrents: Torrent[]): Torrent[] {
	const merged = new Map<string, Torrent>();

	for (const torrent of torrents) {
		const existing = merged.get(torrent.id);
		if (!existing) {
			merged.set(torrent.id, torrent);
			continue;
		}

		const [best, other] =
			torrent.seeds > existing.seeds ? [torrent, existing] : [existing, torrent];
		merged.set(torrent.id, {
			...best,
			magnet: best.magnet || other.magnet,
			downloadUrl: best.downloadUrl || other.downloadUrl,
			seeds: Math.max(best.seeds, other.seeds),
			peers: Math.max(best.peers, other.peers),
			trackers: [...new Set([...best.trackers, ...other.trackers])].sort()
		});
	}

	return [...merged.values()];
}

function formatSize(bytes?: number, decimals = 2): string {
	if (!bytes) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function toTorrent(result: JackettRawResult): Torrent {
	const {
		Title: title,
		MagnetUri,
		Link,
		InfoHash,
		Seeders,
		Peers,
		Size,
		PublishDate,
		Tracker
	} = result;
	const magnet = MagnetUri || (Link?.startsWith('magnet:') ? Link : '');
	const downloadUrl = toDownloadUrl(Link);
	return {
		id:
			getInfoHash(magnet, InfoHash) || magnet || downloadUrl || `${Tracker}:${title}:${Size ?? 0}`,
		title,
		magnet,
		downloadUrl,
		seeds: Seeders || 0,
		peers: Peers || 0,
		size: formatSize(Size),
		sizeBytes: Size || 0,
		date: PublishDate ? new Date(PublishDate).toLocaleDateString() : '',
		publishDate: PublishDate || '',
		trackers: Tracker ? [Tracker] : []
	};
}

export async function searchJackett(
	jackettUrl: string,
	apiKey: string,
	searchTerm: string
): Promise<Torrent[]> {
	const params = new URLSearchParams({ query: searchTerm, apikey: apiKey, limit: '1000' });
	const response = await fetch(`${jackettUrl}/api/v2.0/indexers/all/results?${params}`);
	if (!response.ok) {
		throw new Error(`Jackett API responded with ${response.status} ${response.statusText}`);
	}
	const data = await response.json();
	const results = ((data.Results || []) as JackettRawResult[])
		.filter((result) => !result.CategoryDesc?.toLowerCase().includes('xxx'))
		.map(toTorrent);
	return mergeDuplicates(results);
}

// Parses a same-origin /download link back into the parts Jackett needs.
export function fromDownloadUrl(downloadUrl: string): DownloadParams | null {
	if (!downloadUrl) return null;
	const params = new URL(downloadUrl, 'http://local').searchParams;
	const tracker = params.get('tracker');
	const path = params.get('path');
	const file = params.get('file');
	return tracker && path && file ? { tracker, path, file } : null;
}
