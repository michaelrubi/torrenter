export type TagCategory = 'Resolution' | 'Source' | 'Codec' | 'Audio' | 'Other';

export function extractTags(title: string): Record<TagCategory, string[]> {
    const tags: Record<TagCategory, Set<string>> = {
        Resolution: new Set(),
        Source: new Set(),
        Codec: new Set(),
        Audio: new Set(),
        Other: new Set()
    };

    const lowerTitle = title.toLowerCase();

    // Resolution
    if (/\b2160p\b|\b4k\b/i.test(title)) tags.Resolution.add('4K');
    if (/\b1080p\b/i.test(title)) tags.Resolution.add('1080p');
    if (/\b720p\b/i.test(title)) tags.Resolution.add('720p');
    if (/\b480p\b/i.test(title)) tags.Resolution.add('480p');

    // Source
    if (/\bbluray\b|\bblu-ray\b|\bbdrip\b|\bbrrip\b/i.test(title)) tags.Source.add('BluRay');
    if (/\bweb-?dl\b|\bweb-?rip\b|\bweb\b/i.test(title)) tags.Source.add('WEB');
    if (/\bdvdrip\b|\bdvd\b/i.test(title)) tags.Source.add('DVD');
    if (/\bhdrip\b/i.test(title)) tags.Source.add('HDRip');
    if (/\bcam\b|\bhdcam\b/i.test(title)) tags.Source.add('CAM');
    if (/\bts\b|\bhd-?ts\b|\btelevison sync\b/i.test(title)) tags.Source.add('TS');
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
    if (/\bdts\b|\bdts-?hd\b/i.test(title)) tags.Audio.add('DTS');
    if (/\bac3\b|\bddp\b|\beac3\b/i.test(title)) tags.Audio.add('AC3');
    if (/\baac\b/i.test(title)) tags.Audio.add('AAC');
    if (/\b5\.1\b/i.test(title)) tags.Audio.add('5.1');
    if (/\b7\.1\b/i.test(title)) tags.Audio.add('7.1');

    // Other
    if (/\bhdr\b/i.test(title)) tags.Other.add('HDR');
    if (/\b10bit\b/i.test(title)) tags.Other.add('10bit');
    if (/\b3d\b/i.test(title)) tags.Other.add('3D');
    if (/\brepack\b/i.test(title)) tags.Other.add('Repack');
    if (/\bremux\b/i.test(title)) tags.Other.add('REMUX');

    return {
        Resolution: Array.from(tags.Resolution).sort(),
        Source: Array.from(tags.Source).sort(),
        Codec: Array.from(tags.Codec).sort(),
        Audio: Array.from(tags.Audio).sort(),
        Other: Array.from(tags.Other).sort()
    };
}
