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
