export interface Torrent {
    title: string;
    magnet: string;
    seeds: number;
    peers: number;
    size: string;
    sizeBytes: number;
    date: string;
    publishDate: string;
    tracker: string;
}

export interface DiscoveryItem {
    id: number;
    title: string;
    posterPath: string;
    releaseDate: string;
    overview: string;
    mediaType: 'movie' | 'tv';
}
