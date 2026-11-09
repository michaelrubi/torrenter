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

export type ShowQuality = 'any' | '720p' | '1080p' | '2160p';

export interface TrackedShow {
	id: string;
	user: string;
	tmdb_id: number;
	name: string;
	poster_path: string;
	status: string;
	next_season: number | null;
	next_episode: number | null;
	next_episode_name: string;
	next_air_date: string;
	last_season: number | null;
	last_episode: number | null;
	last_air_date: string;
	last_synced: string;
	auto_download: boolean;
	quality: ShowQuality | '';
	last_grabbed_season: number | null;
	last_grabbed_episode: number | null;
}

export type DownloadStatus = 'queued' | 'sent' | 'done' | 'failed';

export interface DownloadJob {
	id: string;
	user: string;
	show: string;
	season: number;
	episode: number;
	title: string;
	release_title: string;
	magnet: string;
	torrent: string;
	status: DownloadStatus;
	error: string;
	created: string;
	updated: string;
}
