<script lang="ts">
	import type { MediaDetails } from '$lib/types';
	import { fade, scale } from 'svelte/transition';

	let {
		details,
		loading = false,
		onClose,
		onSearch
	} = $props<{
		details: MediaDetails | null;
		loading?: boolean;
		onClose: () => void;
		onSearch: (title: string) => void;
	}>();

	let showTrailer = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showTrailer) showTrailer = false;
			else onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose} transition:fade={{ duration: 150 }}>
	<div class="modal-card" onclick={(e) => e.stopPropagation()} transition:scale={{ duration: 180, start: 0.95 }}>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>

		{#if loading}
			<div class="modal-loading">
				<div class="spinner"></div>
				<p>Loading media details…</p>
			</div>
		{:else if details}
			<div class="backdrop-wrapper">
				{#if details.backdropPath}
					<img src={details.backdropPath} alt={details.title} class="backdrop-img" />
				{/if}
				<div class="backdrop-gradient"></div>

				<div class="header-content">
					<div class="poster-thumb">
						{#if details.posterPath}
							<img src={details.posterPath} alt={details.title} />
						{:else}
							<div class="no-poster">No Poster</div>
						{/if}
					</div>

					<div class="title-info">
						<span class="media-type-tag">{details.mediaType === 'movie' ? 'Movie' : 'TV Show'}</span>
						<h2>{details.title}</h2>
						{#if details.tagline}
							<p class="tagline">"{details.tagline}"</p>
						{/if}

						<div class="meta-row">
							{#if details.releaseDate}
								<span class="meta-item">{new Date(details.releaseDate).getFullYear()}</span>
							{/if}
							{#if details.runtime}
								<span class="meta-item">{details.runtime} mins</span>
							{/if}
							{#if details.genres && details.genres.length > 0}
								<span class="meta-item genres">{details.genres.join(', ')}</span>
							{/if}
						</div>

						<!-- Ratings & External Links -->
						<div class="ratings-bar">
							{#if details.imdbRating || details.voteAverage}
								<a
									href={details.imdbId ? `https://www.imdb.com/title/${details.imdbId}/` : `https://www.imdb.com/find/?q=${encodeURIComponent(details.title)}`}
									target="_blank"
									rel="noopener noreferrer"
									class="rating-pill imdb"
									title="View on IMDb"
								>
									<span class="brand-logo imdb-logo">IMDb</span>
									<span class="rating-val">⭐ {details.imdbRating || `${details.voteAverage}/10`}</span>
								</a>
							{/if}

							<a
								href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(details.title)}`}
								target="_blank"
								rel="noopener noreferrer"
								class="rating-pill rt"
								title="Search on Rotten Tomatoes"
							>
								<span class="brand-logo rt-logo">🍅 RT</span>
								<span class="rating-val">{details.rottenTomatoesScore || 'Rotten Tomatoes'}</span>
							</a>

							{#if details.trailerKey}
								<button class="trailer-btn" onclick={() => (showTrailer = true)}>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
									Trailer
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div class="modal-body">
				<div class="overview-section">
					<h3>Overview</h3>
					<p>{details.overview || 'No overview available.'}</p>
				</div>

				<div class="modal-actions">
					<button class="search-torrents-btn" onclick={() => { onSearch(details.title); onClose(); }}>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						Search Torrents for "{details.title}"
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showTrailer && details?.trailerKey}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="trailer-modal" onclick={() => (showTrailer = false)} transition:fade={{ duration: 150 }}>
		<div class="trailer-wrapper" onclick={(e) => e.stopPropagation()}>
			<button class="close-trailer" onclick={() => (showTrailer = false)}>✕</button>
			<iframe
				src={`https://www.youtube.com/embed/${details.trailerKey}?autoplay=1`}
				title="Trailer"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			></iframe>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(4, 6, 10, 0.85);
		backdrop-filter: blur(8px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--gap-md);
	}

	.modal-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 760px;
		max-height: 90vh;
		overflow-y: auto;
		position: relative;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
	}

	.close-btn {
		position: absolute;
		top: 14px;
		right: 14px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #fff;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10;
		transition: background 0.15s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.modal-loading {
		padding: 60px 20px;
		text-align: center;
		color: var(--muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.backdrop-wrapper {
		position: relative;
		width: 100%;
		min-height: 240px;
		background: var(--surface-2);
		overflow: hidden;
		display: flex;
		align-items: flex-end;
		padding: 24px;
	}

	.backdrop-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.35;
		filter: blur(2px);
	}

	.backdrop-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(10, 14, 22, 0.3) 0%, rgba(10, 14, 22, 0.95) 85%, var(--surface) 100%);
	}

	.header-content {
		position: relative;
		z-index: 2;
		display: flex;
		gap: 20px;
		width: 100%;
	}

	.poster-thumb {
		width: 110px;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-sm);
		overflow: hidden;
		flex-shrink: 0;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.poster-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.no-poster {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		color: var(--muted);
	}

	.title-info {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 6px;
	}

	.media-type-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		background: var(--accent-dim);
		padding: 2px 8px;
		border-radius: 4px;
		align-self: flex-start;
	}

	.title-info h2 {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 700;
		color: #fff;
		margin: 0;
		line-height: 1.2;
	}

	.tagline {
		font-style: italic;
		color: var(--muted);
		font-size: 13px;
		margin: 0;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}

	.ratings-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-top: 6px;
	}

	.rating-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 6px;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		transition: transform 0.15s;
	}

	.rating-pill:hover {
		transform: scale(1.04);
	}

	.rating-pill.imdb {
		background: rgba(245, 197, 24, 0.15);
		border: 1px solid rgba(245, 197, 24, 0.4);
		color: #F5C518;
	}

	.rating-pill.rt {
		background: rgba(250, 50, 50, 0.15);
		border: 1px solid rgba(250, 50, 50, 0.4);
		color: #FA3232;
	}

	.imdb-logo {
		background: #F5C518;
		color: #000;
		font-weight: 800;
		padding: 1px 4px;
		border-radius: 3px;
		font-size: 10px;
	}

	.rt-logo {
		font-weight: 700;
	}

	.trailer-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		padding: 5px 12px;
		border-radius: 6px;
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.trailer-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.modal-body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.overview-section h3 {
		font-family: var(--font-display);
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin-bottom: 8px;
	}

	.overview-section p {
		font-family: var(--font-body);
		font-size: 14px;
		line-height: 1.6;
		color: var(--fg);
		margin: 0;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.search-torrents-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--accent);
		color: #080b0f;
		border: none;
		padding: 12px 20px;
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		width: 100%;
		justify-content: center;
	}

	.search-torrents-btn:hover {
		opacity: 0.9;
	}

	.trailer-modal {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.92);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.trailer-wrapper {
		position: relative;
		width: 100%;
		max-width: 900px;
		aspect-ratio: 16 / 9;
		background: #000;
		border-radius: var(--radius-md);
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
	}

	.trailer-wrapper iframe {
		width: 100%;
		height: 100%;
	}

	.close-trailer {
		position: absolute;
		top: -40px;
		right: 0;
		background: none;
		border: none;
		color: #fff;
		font-size: 24px;
		cursor: pointer;
	}
</style>
