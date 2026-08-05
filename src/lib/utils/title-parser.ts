export type TagCategory = 'Resolution' | 'Source' | 'Codec' | 'Audio' | 'Season' | 'Other';

export interface QualityInfo {
	tier: 'Top Tier' | 'High Quality' | 'Standard' | 'Low Quality';
	score: number;
	badgeColor: 'gold' | 'blue' | 'green' | 'amber';
}

export function extractTags(title: string): Record<TagCategory, string[]> {
	const tags: Record<TagCategory, Set<string>> = {
		Resolution: new Set(),
		Source: new Set(),
		Codec: new Set(),
		Audio: new Set(),
		Season: new Set(),
		Other: new Set()
	};

	// Resolution
	if (/\b2160p\b|\b4k\b|\buhd\b/i.test(title)) tags.Resolution.add('4K');
	if (/\b1080p\b/i.test(title)) tags.Resolution.add('1080p');
	if (/\b720p\b/i.test(title)) tags.Resolution.add('720p');
	if (/\b480p\b/i.test(title)) tags.Resolution.add('480p');

	// Source - INCLUDING DCP / DCPRIP
	if (/\bdcp-?rip\b|\bdcp\b/i.test(title)) tags.Source.add('DCPRIP');
	if (/\bbluray\b|\bblu-ray\b|\bbdrip\b|\bbrrip\b/i.test(title)) tags.Source.add('BluRay');
	if (/\bweb-?dl\b|\bweb-?rip\b|\bweb\b/i.test(title)) tags.Source.add('WEB');
	if (/\bdvdrip\b|\bdvd\b/i.test(title)) tags.Source.add('DVD');
	if (/\bhdrip\b/i.test(title)) tags.Source.add('HDRip');
	if (/\bhdtv\b/i.test(title)) tags.Source.add('HDTV');
	if (/\bcam\b|\bhdcam\b/i.test(title)) tags.Source.add('CAM');
	if (/\bts\b|\bhd-?ts\b|\btelevison sync\b|\btelesync\b/i.test(title)) tags.Source.add('TS');
	if (/\btc\b|\bhd-?tc\b|\btelecine\b/i.test(title)) tags.Source.add('TC');
	if (/\bscr\b|\bscreener\b|\bdvdscr\b/i.test(title)) tags.Source.add('Screener');

	// Codec
	if (/\bx265\b|\bh\.?265\b|\bhevc\b/i.test(title)) tags.Codec.add('x265');
	if (/\bx264\b|\bh\.?264\b|\bavc\b/i.test(title)) tags.Codec.add('x264');
	if (/\bav1\b/i.test(title)) tags.Codec.add('AV1');
	if (/\bxvid\b/i.test(title)) tags.Codec.add('XviD');
	if (/\bdivx\b/i.test(title)) tags.Codec.add('DivX');

	// Audio
	if (/\batmos\b/i.test(title)) tags.Audio.add('Atmos');
	if (/\bdts\b|\bdts-?hd\b|\bdts-x\b/i.test(title)) tags.Audio.add('DTS');
	if (/\bac3\b|\bddp\b|\beac3\b|\btruehd\b/i.test(title)) tags.Audio.add('AC3');
	if (/\baac\b/i.test(title)) tags.Audio.add('AAC');
	if (/\bflac\b/i.test(title)) tags.Audio.add('FLAC');
	if (/\b5\.1\b/i.test(title)) tags.Audio.add('5.1');
	if (/\b7\.1\b/i.test(title)) tags.Audio.add('7.1');

	// Season parsing for TV Shows
	const sMatch = title.match(/\bS(\d{1,2})\b/i) || title.match(/\bSeason\s*(\d{1,2})\b/i);
	if (sMatch) {
		const sNum = parseInt(sMatch[1], 10);
		tags.Season.add(`Season ${sNum}`);
	}
	if (/\bcomplete(\.series|\.season|s\d+)?\b/i.test(title)) {
		tags.Season.add('Complete Series');
	}

	// Other
	if (/\bhdr10\+?\b|\bhdr\b/i.test(title)) tags.Other.add('HDR');
	if (/\bdolby\s?vision\b|\bdv\b/i.test(title)) tags.Other.add('Dolby Vision');
	if (/\b10bit\b/i.test(title)) tags.Other.add('10bit');
	if (/\b3d\b/i.test(title)) tags.Other.add('3D');
	if (/\brepack\b/i.test(title)) tags.Other.add('Repack');
	if (/\bremux\b/i.test(title)) tags.Other.add('REMUX');

	return {
		Resolution: Array.from(tags.Resolution).sort(),
		Source: Array.from(tags.Source).sort(),
		Codec: Array.from(tags.Codec).sort(),
		Audio: Array.from(tags.Audio).sort(),
		Season: Array.from(tags.Season).sort(),
		Other: Array.from(tags.Other).sort()
	};
}

export function getQualityTier(title: string): QualityInfo {
	const extracted = extractTags(title);
	let score = 50;

	// Resolution score
	if (extracted.Resolution.includes('4K')) score += 30;
	else if (extracted.Resolution.includes('1080p')) score += 20;
	else if (extracted.Resolution.includes('720p')) score += 10;
	else if (extracted.Resolution.includes('480p')) score -= 10;

	// Source score
	if (extracted.Source.includes('DCPRIP')) score += 25;
	if (extracted.Source.includes('BluRay')) score += 20;
	if (extracted.Other.includes('REMUX')) score += 15;
	if (extracted.Source.includes('WEB')) score += 12;
	if (extracted.Source.includes('DVD')) score += 5;
	if (extracted.Source.includes('CAM') || extracted.Source.includes('TS') || extracted.Source.includes('TC')) score -= 40;

	// Codec & Audio & Extras
	if (extracted.Other.includes('Dolby Vision') || extracted.Other.includes('HDR')) score += 8;
	if (extracted.Audio.includes('Atmos') || extracted.Audio.includes('7.1')) score += 7;
	if (extracted.Codec.includes('x265') || extracted.Codec.includes('AV1')) score += 5;

	if (score >= 85 || extracted.Source.includes('DCPRIP') || (extracted.Resolution.includes('4K') && extracted.Other.includes('REMUX'))) {
		return { tier: 'Top Tier', score, badgeColor: 'gold' };
	} else if (score >= 65) {
		return { tier: 'High Quality', score, badgeColor: 'blue' };
	} else if (score >= 35) {
		return { tier: 'Standard', score, badgeColor: 'green' };
	} else {
		return { tier: 'Low Quality', score, badgeColor: 'amber' };
	}
}
