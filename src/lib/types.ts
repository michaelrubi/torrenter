export interface Torrent {
	id: string;
	title: string;
	magnet: string;
	downloadUrl: string;
	seeds: number;
	peers: number;
	size: string;
	sizeBytes: number;
	date: string;
	publishDate: string;
	trackers: string[];
}

export interface DiscoveryItem {
	id: number;
	title: string;
	posterPath: string;
	backdropPath?: string;
	releaseDate: string;
	overview: string;
	mediaType: 'movie' | 'tv';
	voteAverage?: number;
	voteCount?: number;
}

export interface MediaDetails {
	id: number;
	title: string;
	posterPath: string;
	backdropPath: string;
	releaseDate: string;
	overview: string;
	mediaType: 'movie' | 'tv';
	voteAverage: number;
	voteCount: number;
	genres: string[];
	runtime?: number;
	tagline?: string;
	imdbId?: string;
	imdbRating?: string;
	rottenTomatoesScore?: string;
	trailerKey?: string;
}
