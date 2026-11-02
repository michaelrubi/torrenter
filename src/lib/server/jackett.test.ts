import { describe, expect, it } from 'vitest';
import type { Torrent } from '$lib/types';
import { getInfoHash, mergeDuplicates, toDownloadUrl, toJackettDownloadUrl } from './jackett';

const HEX = 'c12fe1c06bba254a9dc9f519b335aa7c1367a88a';
const BASE32 = 'YEX6DQDLXISUVHOJ6UM3GNNKPQJWPKEK';

function torrent(overrides: Partial<Torrent>): Torrent {
	return {
		id: HEX,
		title: 'Dune.2021.1080p.BluRay.x264',
		magnet: '',
		downloadUrl: '',
		seeds: 0,
		peers: 0,
		size: '1 GB',
		sizeBytes: 1073741824,
		date: '',
		publishDate: '',
		trackers: ['A'],
		...overrides
	};
}

describe('getInfoHash', () => {
	it('prefers the hash Jackett reports and lowercases it', () => {
		expect(getInfoHash('', HEX.toUpperCase())).toBe(HEX);
	});

	it('reads a hex hash from a magnet', () => {
		expect(getInfoHash(`magnet:?xt=urn:btih:${HEX}&dn=x`)).toBe(HEX);
	});

	it('gives base32 and hex forms of one torrent the same hash', () => {
		expect(getInfoHash(`magnet:?xt=urn:btih:${BASE32}`)).toBe(HEX);
	});

	it('returns null when there is no usable hash', () => {
		expect(getInfoHash('')).toBeNull();
		expect(getInfoHash('magnet:?xt=urn:btih:nothex')).toBeNull();
	});
});

describe('toDownloadUrl', () => {
	const link =
		'http://jackett:9117/dl/my-tracker/?jackett_apikey=secret&path=abc%2Bdef&file=Dune+2021';

	it('drops the API key', () => {
		const url = toDownloadUrl(link);
		expect(url).not.toContain('secret');
		expect(url).not.toContain('jackett_apikey');
	});

	it('keeps what the proxy needs', () => {
		const params = new URL(toDownloadUrl(link), 'http://app').searchParams;
		expect(Object.fromEntries(params)).toEqual({
			tracker: 'my-tracker',
			path: 'abc+def',
			file: 'Dune 2021'
		});
	});

	it('supports Jackett behind a base path', () => {
		expect(toDownloadUrl('http://host/jackett/dl/t/?path=a&file=b')).toBe(
			'/download?tracker=t&path=a&file=b'
		);
	});

	it.each([null, undefined, '', 'not a url', 'https://tracker.example/file.torrent'])(
		'returns nothing for %s',
		(value) => {
			expect(toDownloadUrl(value)).toBe('');
		}
	);
});

describe('toJackettDownloadUrl', () => {
	it('always stays on the configured host', () => {
		const url = new URL(
			toJackettDownloadUrl('http://jackett:9117', 'secret', {
				tracker: '../../evil.example/',
				path: 'p',
				file: 'f'
			})
		);
		expect(url.host).toBe('jackett:9117');
		expect(url.pathname).toBe('/dl/..%2F..%2Fevil.example%2F/');
		expect(url.searchParams.get('jackett_apikey')).toBe('secret');
	});
});

describe('mergeDuplicates', () => {
	it('merges one torrent found on two trackers', () => {
		const [merged, ...rest] = mergeDuplicates([
			torrent({ seeds: 5, peers: 9, trackers: ['B'], downloadUrl: '/download?x' }),
			torrent({ seeds: 20, peers: 3, trackers: ['A'], magnet: 'magnet:?a', title: 'best' })
		]);

		expect(rest).toEqual([]);
		expect(merged).toMatchObject({
			title: 'best',
			magnet: 'magnet:?a',
			downloadUrl: '/download?x',
			seeds: 20,
			peers: 9,
			trackers: ['A', 'B']
		});
	});

	it('keeps different torrents apart', () => {
		expect(mergeDuplicates([torrent({ id: 'a' }), torrent({ id: 'b' })])).toHaveLength(2);
	});

	it('does not repeat a tracker', () => {
		const [merged] = mergeDuplicates([torrent({}), torrent({})]);
		expect(merged.trackers).toEqual(['A']);
	});
});
