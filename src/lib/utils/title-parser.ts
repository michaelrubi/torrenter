export type TagCategory = 'Resolution' | 'Source' | 'Codec' | 'Audio' | 'Season' | 'Other';

export interface QualityInfo {
	tier: 'Top Tier' | 'High Quality' | 'Standard' | 'Low Quality';
	score: number;
	badgeColor: 'gold' | 'blue' | 'green' | 'amber';
}

// Short words like "Cam" or "Web" can be part of a film's name, so they only count
// once the name has ended, at the first year, resolution or season marker.
function releaseInfoOf(title: string): string {
	for (const match of title.matchAll(/\b(?:19|20)\d{2}\b|\b\d{3,4}p\b|\bS\d{1,2}(?=E\d|\b)/gi)) {
		if (match.index > 0) return title.slice(match.index);
	}
	return title;
}

export function extractTags(rawTitle: string): Record<TagCategory, string[]> {
	// \b treats underscores as word characters, so normalise them to separators.
	const title = rawTitle.replace(/_/g, '.');
	const releaseInfo = releaseInfoOf(title);
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
	if (/\bblu-?ray\b|\bbdrip\b|\bbrrip\b|\bbd-?remux\b/i.test(title)) tags.Source.add('BluRay');
	if (/\bweb[-.]?dl\b|\bweb-?rip\b/i.test(title) || /\bweb\b/i.test(releaseInfo)) {
		tags.Source.add('WEB');
	}
	if (/\bdvdrip\b|\bdvd\b/i.test(title)) tags.Source.add('DVD');
	if (/\bhdrip\b/i.test(title)) tags.Source.add('HDRip');
	if (/\bhdtv\b/i.test(title)) tags.Source.add('HDTV');
	if (/\bhd-?cam\b|\bcam-?rip\b/i.test(title) || /\bcam\b/i.test(releaseInfo)) {
		tags.Source.add('CAM');
	}
	if (/\bhd-?ts\b|\btelesync\b/i.test(title) || /\bts\b/i.test(releaseInfo)) {
		tags.Source.add('TS');
	}
	if (/\bhd-?tc\b|\btelecine\b/i.test(title) || /\btc\b/i.test(releaseInfo)) {
		tags.Source.add('TC');
	}
	if (/\bscr\b|\bscreener\b|\bdvdscr\b/i.test(title)) tags.Source.add('Screener');

	// Codec
	if (/\bx265\b|\bh\.?265\b|\bhevc\b/i.test(title)) tags.Codec.add('x265');
	if (/\bx264\b|\bh\.?264\b|\bavc\b/i.test(title)) tags.Codec.add('x264');
	if (/\bav1\b/i.test(title)) tags.Codec.add('AV1');
	if (/\bxvid\b/i.test(title)) tags.Codec.add('XviD');
	if (/\bdivx\b/i.test(title)) tags.Codec.add('DivX');

	// Audio - channel layouts are often glued to the codec, as in DDP5.1 or AAC2.0
	if (/\batmos\b/i.test(title)) tags.Audio.add('Atmos');
	if (/\bdts(?=\d|\b)/i.test(title)) tags.Audio.add('DTS');
	if (/\b(?:e-?)?ac-?3(?=\d|\b)|\bddp(?=\d|\b)|\bdd\+?\d|\btruehd(?=\d|\b)/i.test(title)) {
		tags.Audio.add('AC3');
	}
	if (/\baac(?=\d|\b)/i.test(title)) tags.Audio.add('AAC');
	if (/\bflac(?=\d|\b)/i.test(title)) tags.Audio.add('FLAC');
	if (/(?<!\d)5\.1(?!\d)/.test(title)) tags.Audio.add('5.1');
	if (/(?<!\d)7\.1(?!\d)/.test(title)) tags.Audio.add('7.1');

	// Season parsing for TV Shows
	const sMatch =
		title.match(/\bS(\d{1,2})(?=E\d|\b)/i) || title.match(/\bSeason[\s.]*(\d{1,2})\b/i);
	if (sMatch) {
		const sNum = parseInt(sMatch[1], 10);
		tags.Season.add(`Season ${sNum}`);
	}
	if (/\bcomplete(\.series|\.season|s\d+)?\b/i.test(title)) {
		tags.Season.add('Complete Series');
	}

	// Other
	if (/\bhdr(?:10(?:\+|plus)?)?(?!\w)/i.test(title)) tags.Other.add('HDR');
	if (/\bdolby[\s.]?vision\b/i.test(title) || /\bdv\b/i.test(releaseInfo)) {
		tags.Other.add('Dolby Vision');
	}
	if (/\b10[-\s.]?bit\b/i.test(title)) tags.Other.add('10bit');
	if (/\b3d\b/i.test(title)) tags.Other.add('3D');
	if (/\brepack\b/i.test(title)) tags.Other.add('Repack');
	if (/\b(?:bd-?)?remux\b/i.test(title)) tags.Other.add('REMUX');

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
	if (
		extracted.Source.includes('CAM') ||
		extracted.Source.includes('TS') ||
		extracted.Source.includes('TC')
	)
		score -= 40;

	// Codec & Audio & Extras
	if (extracted.Other.includes('Dolby Vision') || extracted.Other.includes('HDR')) score += 8;
	if (extracted.Audio.includes('Atmos') || extracted.Audio.includes('7.1')) score += 7;
	if (extracted.Codec.includes('x265') || extracted.Codec.includes('AV1')) score += 5;

	if (
		score >= 85 ||
		extracted.Source.includes('DCPRIP') ||
		(extracted.Resolution.includes('4K') && extracted.Other.includes('REMUX'))
	) {
		return { tier: 'Top Tier', score, badgeColor: 'gold' };
	} else if (score >= 65) {
		return { tier: 'High Quality', score, badgeColor: 'blue' };
	} else if (score >= 35) {
		return { tier: 'Standard', score, badgeColor: 'green' };
	} else {
		return { tier: 'Low Quality', score, badgeColor: 'amber' };
	}
}
