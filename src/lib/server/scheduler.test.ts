import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ building: false, dev: true }));

const { pickRelease } = await import('./scheduler');
const { nextEpisodeToGrab } = await import('./shows');

const torrent = (title: string, seeds = 10, magnet = 'magnet:?xt=urn:btih:abc') => ({
	id: title,
	title,
	magnet,
	downloadUrl: '',
	seeds,
	peers: 0,
	size: '',
	sizeBytes: 0,
	date: '',
	publishDate: '',
	trackers: []
});

describe('nextEpisodeToGrab', () => {
	it('takes the next aired episode in the same season', () => {
		expect(
			nextEpisodeToGrab({
				last_grabbed_season: 2,
				last_grabbed_episode: 3,
				last_season: 2,
				last_episode: 5
			})
		).toEqual({ season: 2, episode: 4 });
	});

	it('returns null when caught up', () => {
		expect(
			nextEpisodeToGrab({
				last_grabbed_season: 2,
				last_grabbed_episode: 5,
				last_season: 2,
				last_episode: 5
			})
		).toBeNull();
	});

	it('rolls over into a new season', () => {
		expect(
			nextEpisodeToGrab({
				last_grabbed_season: 1,
				last_grabbed_episode: 8,
				last_season: 2,
				last_episode: 1
			})
		).toEqual({ season: 2, episode: 1 });
	});

	it('returns null before anything has aired', () => {
		expect(
			nextEpisodeToGrab({
				last_grabbed_season: null,
				last_grabbed_episode: null,
				last_season: null,
				last_episode: null
			})
		).toBeNull();
	});
});

describe('pickRelease', () => {
	it('picks the best-seeded release of the right show, episode and quality', () => {
		const pick = pickRelease(
			[
				torrent('The Bear S03E02 1080p WEB H264-GRP', 50),
				torrent('The Bear S03E02 1080p WEB H264-OTHER', 120),
				torrent('The Bear S03E02 720p WEB H264-GRP', 900),
				torrent('The Bear S03E12 1080p WEB H264-GRP', 900),
				torrent('The Bear Necessities S03E02 1080p WEB', 900),
				torrent('The Bear S03E02-E03 1080p WEB', 900)
			],
			'The Bear',
			3,
			2,
			'1080p'
		);
		expect(pick?.title).toBe('The Bear S03E02 1080p WEB H264-OTHER');
	});

	it('ignores dead and linkless releases', () => {
		expect(
			pickRelease(
				[torrent('Show S01E01 1080p', 0), torrent('Show S01E01 1080p', 5, '')],
				'Show',
				1,
				1,
				'any'
			)
		).toBeNull();
	});

	it('matches names with punctuation differences', () => {
		expect(
			pickRelease([torrent('Law.and.Order.S24E01.1080p.WEB', 5)], 'Law & Order', 24, 1, 'any')
		).not.toBeNull();
	});
});
