import { describe, expect, it } from 'vitest';
import { extractTags, getQualityTier, parseMediaInfo, type TagCategory } from './title-parser';

describe('extractTags', () => {
	it.each<[string, TagCategory, string]>([
		['Severance.S02E05.1080p.WEB-DL.H.264-GROUP', 'Season', 'Season 2'],
		['Show.Name.S01.1080p.BluRay.x265-GROUP', 'Season', 'Season 1'],
		['Show Name Season 3 1080p', 'Season', 'Season 3'],
		['Show.Name.Season.4.720p', 'Season', 'Season 4'],
		['Dune.2021.1080p.WEB-DL.DDP5.1.H.264', 'Audio', 'AC3'],
		['Dune.2021.1080p.WEB-DL.DDP5.1.H.264', 'Audio', '5.1'],
		['Dune.2021.1080p.BluRay.DD5.1.x264', 'Audio', 'AC3'],
		['Dune.2021.1080p.BluRay.AC3.5.1.x264', 'Audio', '5.1'],
		['Dune.2021.1080p.WEBRip.AAC2.0.x264', 'Audio', 'AAC'],
		['Dune.2021.1080p.BluRay.DTS5.1.x264', 'Audio', 'DTS'],
		['Dune.2021.1080p.BluRay.DTS-HD.MA.7.1.x264', 'Audio', 'DTS'],
		['Dune.2021.2160p.BluRay.TrueHD.7.1.Atmos', 'Audio', '7.1'],
		['Dune.2021.1080p.BluRay.FLAC2.0.x264', 'Audio', 'FLAC'],
		['Dune 2021 1080p 10-bit HEVC', 'Other', '10bit'],
		['Dune.2021.2160p.WEB-DL.HDR10+.x265', 'Other', 'HDR'],
		['Dune.2021.2160p.Dolby.Vision.x265', 'Other', 'Dolby Vision'],
		['Dune.2021.2160p.BDRemux.x265', 'Other', 'REMUX'],
		['Dune.2021.CAMRip.x264', 'Source', 'CAM'],
		['Dune.2021.HDTS.720p.x264', 'Source', 'TS'],
		['Dune.2021.720p.WEB.x264', 'Source', 'WEB'],
		['Dune.2021.CAM.x264', 'Source', 'CAM']
	])('tags %s with %s %s', (title, category, tag) => {
		expect(extractTags(title)[category]).toContain(tag);
	});

	it('reads titles separated by underscores', () => {
		const tags = extractTags('Movie_2021_1080p_BluRay_x264');
		expect(tags.Resolution).toEqual(['1080p']);
		expect(tags.Source).toEqual(['BluRay']);
		expect(tags.Codec).toEqual(['x264']);
	});

	it.each([
		['The.Web.2019.1080p.BluRay.x264', 'WEB'],
		['Cam.2018.1080p.WEB-DL.x264', 'CAM'],
		['Tc.Story.2015.1080p.BluRay.x264', 'TC'],
		['Ts.Eliot.2015.1080p.BluRay.x264', 'TS']
	])('does not read the film name of %s as source %s', (title, tag) => {
		expect(extractTags(title).Source).not.toContain(tag);
	});

	it('does not read a season number as a channel layout', () => {
		expect(extractTags('Show.S05.1080p.WEB-DL').Audio).toEqual([]);
	});
});

describe('getQualityTier', () => {
	it('ranks a cam rip as low quality', () => {
		expect(getQualityTier('Dune.2021.CAMRip.x264').tier).toBe('Low Quality');
	});

	it('does not penalise a film that is named Cam', () => {
		expect(getQualityTier('Cam.2018.1080p.WEB-DL.x264').tier).toBe('High Quality');
	});

	it('does not double count a film that is named Web', () => {
		const title = getQualityTier('The.Web.2019.1080p.BluRay.x264');
		expect(title.score).toBe(getQualityTier('Heat.1995.1080p.BluRay.x264').score);
	});
});

describe('parseMediaInfo', () => {
	it.each([
		['Dune.2021.1080p.WEB-DL.DDP5.1.H.264', { name: 'Dune', year: 2021 }],
		['Severance.S02E05.1080p.WEB-DL.H.264-GROUP', { name: 'Severance', season: 2 }],
		['The Office (2005) S03 1080p', { name: 'The Office', year: 2005, season: 3 }],
		['[YTS] The_Matrix_1999_720p', { name: 'The Matrix', year: 1999 }],
		['www.Torrenting.com - Alien.1979.2160p', { name: 'Alien', year: 1979 }]
	])('reads %s', (title, expected) => {
		expect(parseMediaInfo(title)).toEqual(expected);
	});

	it('gives up on titles with no release info', () => {
		expect(parseMediaInfo('Some Random Pack')).toBeNull();
	});
});
