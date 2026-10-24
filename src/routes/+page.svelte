<script lang="ts">
	import Results from '$lib/components/Results.svelte';
	import SkeletonResults from '$lib/components/SkeletonResults.svelte';
	import MediaCard from '$lib/components/MediaCard.svelte';
	import MediaModal from '$lib/components/MediaModal.svelte';
	import { searchTorrents, getDiscoveryContent, getMediaDetails } from './data.remote';
	import type { Torrent, DiscoveryItem, MediaDetails } from '$lib/types';
	import { isHttpError } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { MorphIcon } from 'morphicons/svelte';
	import { Search, X } from 'lucide';

	let searchTerm = $state('');
	let activeQuery = $state('');
	let results: Torrent[] = $state([]);
	let discoveryResults: DiscoveryItem[] = $state([]);
	let loading = $state(false);
	let searchError = $state<string | null>(null);
	let hasSearched = $state(false);
	let mediaType: 'movie' | 'tv' = $state('movie');

	let discoveryLoading = $state(false);
	let discoveryLoadingMore = $state(false);
	let discoveryError = $state<string | null>(null);
	let discoveryPage = $state(1);
	let hasMoreDiscovery = $state(true);

	let selectedMedia: MediaDetails | null = $state(null);
	let isModalOpen = $state(false);
	let modalLoading = $state(false);

	let searchInputEl: HTMLInputElement | undefined = $state();
	let lastQuery: string | null = null;

	$effect(() => {
		const q = (page.url.searchParams.get('search') || '').trim();
		if (q !== lastQuery) {
			lastQuery = q;
			searchTerm = q;
			activeQuery = q;
			if (q) {
				performSearch(q);
			} else {
				hasSearched = false;
				searchError = null;
				results = [];
				if (discoveryResults.length === 0 && !discoveryLoading) {
					loadDiscovery(1, false);
				}
			}
		}
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (isModalOpen) return;
		const target = e.target as HTMLElement | null;
		const isInput =
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			searchInputEl?.focus();
			searchInputEl?.select();
		} else if (!isInput && e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			searchInputEl?.focus();
		}
	}

	async function loadDiscovery(targetPage = 1, append = false) {
		if (append) {
			discoveryLoadingMore = true;
		} else {
			discoveryLoading = true;
			discoveryError = null;
		}
		try {
			const data = await getDiscoveryContent({ page: targetPage, mediaType });
			if (append) {
				const existingIds = new Set(discoveryResults.map((d) => d.id));
				const uniqueNew = data.filter((d: DiscoveryItem) => !existingIds.has(d.id));
				discoveryResults = [...discoveryResults, ...uniqueNew];
			} else {
				discoveryResults = data;
			}
			discoveryPage = targetPage;
			hasMoreDiscovery = data.length >= 20;
		} catch (e) {
			console.error('Discovery load failed', e);
			discoveryError = 'Unable to load popular titles from TMDB.';
		} finally {
			discoveryLoading = false;
			discoveryLoadingMore = false;
		}
	}

	function switchMediaType(type: 'movie' | 'tv') {
		if (mediaType === type && discoveryResults.length > 0) return;
		mediaType = type;
		discoveryPage = 1;
		loadDiscovery(1, false);
	}

	function clearInputOrReset() {
		searchTerm = '';
		if (page.url.searchParams.has('search')) {
			goto(resolve('/'), { keepFocus: true });
		} else {
			hasSearched = false;
			searchError = null;
			results = [];
			searchInputEl?.focus();
		}
	}

	function backToDiscovery() {
		searchTerm = '';
		if (page.url.searchParams.has('search')) {
			goto(resolve('/'));
		} else {
			hasSearched = false;
			searchError = null;
			results = [];
			if (discoveryResults.length === 0) loadDiscovery(1, false);
		}
	}

	async function performSearch(term: string) {
		loading = true;
		hasSearched = true;
		searchError = null;
		results = [];
		try {
			results = await searchTorrents(term);
		} catch (error) {
			console.error('Search failed:', error);
			searchError = isHttpError(error)
				? error.body.message
				: 'Unable to reach Jackett indexer. Check your connection or indexer status.';
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleSearch(e: Event) {
		e.preventDefault();
		const trimmed = searchTerm.trim();
		if (!trimmed) {
			backToDiscovery();
			return;
		}
		if (trimmed === activeQuery && hasSearched) {
			performSearch(trimmed);
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/')}?search=${encodeURIComponent(trimmed)}`, { keepFocus: true });
	}

	async function openDetails(item: DiscoveryItem) {
		isModalOpen = true;
		modalLoading = true;
		selectedMedia = null;
		try {
			const details = await getMediaDetails({
				id: item.id,
				mediaType: item.mediaType || mediaType
			});
			selectedMedia = details;
		} catch (err) {
			console.error('Failed to get media details:', err);
		} finally {
			modalLoading = false;
		}
	}

	function triggerDirectSearch(title: string) {
		searchTerm = title;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/')}?search=${encodeURIComponent(title)}`, { keepFocus: true });
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="page-body">
	<!-- Search Section -->
	<div class="search-section">
		<div class="search-wrapper">
			<form onsubmit={handleSearch} class="search-form">
				<div class="search-input-row">
					<!-- Magnifier doubles as the clear button once there is text: one slot,
					     one morph, no button popping in and out of the row. -->
					<button
						type="button"
						class="search-icon-btn"
						onclick={clearInputOrReset}
						disabled={!searchTerm}
						aria-label="Clear search"
					>
						<MorphIcon
							icon={searchTerm ? X : Search}
							size={18}
							strokeWidth={2}
							reducedMotion="user"
						/>
					</button>
					<input
						bind:this={searchInputEl}
						type="text"
						bind:value={searchTerm}
						placeholder="Search movies or TV shows (e.g. Inception, Dune 4K, S01)..."
						class="search-input"
						aria-label="Search"
					/>
					{#if !searchTerm}
						<kbd class="search-kbd" aria-hidden="true" title="Press / to focus search">/</kbd>
					{/if}
					<button type="submit" class="search-btn" disabled={loading}>Search</button>
				</div>
			</form>

			<!-- Segmented control & discovery navigation -->
			<div class="controls-row">
				{#if hasSearched}
					<button type="button" class="back-home-btn" onclick={backToDiscovery}>
						← Popular Discoveries
					</button>
					{#if activeQuery}
						<span class="active-query-label">
							Query: <strong>{activeQuery}</strong>
						</span>
					{/if}
				{:else}
					<div class="segmented" role="tablist" aria-label="Discovery media type">
						<button
							type="button"
							role="tab"
							aria-selected={mediaType === 'movie'}
							class="seg-btn {mediaType === 'movie' ? 'active' : ''}"
							onclick={() => switchMediaType('movie')}
						>
							Movies
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={mediaType === 'tv'}
							class="seg-btn {mediaType === 'tv' ? 'active' : ''}"
							onclick={() => switchMediaType('tv')}
						>
							TV Shows
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="content-section">
		{#if loading}
			<SkeletonResults />
		{:else if hasSearched && searchError}
			<div class="empty-state error-state" role="alert">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="44"
					height="44"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<h3>Indexer connection error</h3>
				<p>{searchError}</p>
				<button type="button" class="retry-btn" onclick={() => performSearch(activeQuery)}>
					Retry Search
				</button>
			</div>
		{:else if hasSearched && results.length === 0}
			<div class="empty-state">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
					<path d="M8 11h6" />
				</svg>
				<h3>No torrent results found for "{activeQuery}"</h3>
				<p>Try adjusting your search terms or checking different trackers</p>
			</div>
		{:else if hasSearched && results.length > 0}
			<Results {results} />
		{:else}
			<div class="discovery-section">
				<div class="discovery-header">
					<h2 class="section-heading">Popular {mediaType === 'movie' ? 'Movies' : 'TV Shows'}</h2>
					<span class="section-subtitle">
						Select any title for ratings, plot details & trailer, or search torrents directly
					</span>
				</div>

				{#if discoveryLoading && discoveryResults.length === 0}
					<div class="grid" aria-busy="true" aria-label="Loading popular titles">
						{#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
							<div class="poster-skeleton">
								<div class="poster-skeleton-img"></div>
								<div class="poster-skeleton-line w-75"></div>
								<div class="poster-skeleton-line w-40"></div>
							</div>
						{/each}
					</div>
				{:else if discoveryError && discoveryResults.length === 0}
					<div class="empty-state">
						<h3>Unable to load popular titles</h3>
						<p>{discoveryError}</p>
						<button type="button" class="retry-btn" onclick={() => loadDiscovery(1, false)}>
							Retry
						</button>
					</div>
				{:else if discoveryResults.length === 0}
					<div class="empty-state">
						<h3>No discovery titles available</h3>
						<p>Use the search bar above to query torrent indexers directly.</p>
					</div>
				{:else}
					<div class="grid">
						{#each discoveryResults as item (item.id)}
							<MediaCard
								title={item.title}
								posterUrl={item.posterPath}
								year={item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : ''}
								voteAverage={item.voteAverage}
								onClick={() => openDetails(item)}
								onSearchClick={() => triggerDirectSearch(item.title)}
							/>
						{/each}
					</div>

					{#if hasMoreDiscovery}
						<div class="load-more-row">
							<button
								type="button"
								class="load-more-btn"
								disabled={discoveryLoadingMore}
								onclick={() => loadDiscovery(discoveryPage + 1, true)}
							>
								{discoveryLoadingMore ? 'Loading…' : 'Load More Titles'}
							</button>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if isModalOpen}
	<MediaModal
		details={selectedMedia}
		loading={modalLoading}
		onClose={() => (isModalOpen = false)}
		onSearch={(t) => triggerDirectSearch(t)}
	/>
{/if}

<style>
	.page-body {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 var(--gap-lg);
		width: 100%;
	}

	/* Search section */
	.search-section {
		padding: var(--gap-xl) 0 var(--gap-lg);
	}

	.search-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--gap-sm);
	}

	.search-form {
		width: 100%;
	}

	.search-input-row {
		display: flex;
		align-items: center;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 0 var(--gap-md);
		gap: var(--gap-sm);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.search-input-row:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-dim);
	}

	.search-icon-btn {
		display: inline-flex;
		align-items: center;
		background: none;
		border: none;
		padding: 0;
		color: var(--muted);
		flex-shrink: 0;
		cursor: pointer;
		transition: color 0.15s;
	}

	.search-icon-btn:disabled {
		cursor: default;
	}

	.search-icon-btn:hover:not(:disabled) {
		color: var(--fg);
	}

	.search-input {
		flex: 1;
		min-width: 0;
		background: none;
		border: none;
		outline: none;
		font-family: var(--font-mono);
		font-size: 15px;
		color: var(--fg);
		height: 48px;
	}

	.search-input::placeholder {
		color: var(--muted);
	}

	.search-kbd {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 2px 7px;
		line-height: 1.2;
		pointer-events: none;
		user-select: none;
	}

	.search-input-row:focus-within .search-kbd {
		display: none;
	}

	.search-btn {
		background: var(--accent);
		color: #080b0f;
		border: none;
		border-radius: var(--radius-sm);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		padding: 8px 16px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.search-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.search-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.controls-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gap-sm);
		min-height: 30px;
	}

	.active-query-label {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}

	.active-query-label strong {
		color: var(--fg);
	}

	/* Segmented control */
	.segmented {
		display: flex;
		gap: var(--gap-xs);
	}

	.seg-btn {
		background: none;
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 6px 14px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.seg-btn.active {
		background: var(--accent-dim);
		border-color: var(--accent);
		color: var(--accent);
	}

	.seg-btn:hover:not(.active) {
		border-color: var(--muted);
		color: var(--fg);
	}

	.back-home-btn {
		background: none;
		border: none;
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 12px;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.back-home-btn:hover {
		opacity: 0.85;
	}

	/* Content */
	.content-section {
		padding-bottom: var(--gap-xl);
	}

	/* Discovery */
	.discovery-section {
		width: 100%;
	}

	.discovery-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: var(--gap-md);
		flex-wrap: wrap;
		gap: 8px;
	}

	.section-heading {
		font-family: var(--font-display);
		font-size: 18px;
		letter-spacing: -0.01em;
		color: var(--fg);
		font-weight: 700;
		margin: 0;
	}

	.section-subtitle {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 20px;
	}

	@media (min-width: 640px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	@media (min-width: 1440px) {
		.grid {
			grid-template-columns: repeat(5, 1fr);
		}
	}

	@keyframes shimmer {
		0% {
			background-position: -400px 0;
		}
		100% {
			background-position: 400px 0;
		}
	}

	.poster-skeleton {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--gap-sm);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.poster-skeleton-img,
	.poster-skeleton-line {
		border-radius: var(--radius-sm);
		background: linear-gradient(
			90deg,
			var(--surface) 25%,
			var(--surface-2) 50%,
			var(--surface) 75%
		);
		background-size: 800px 100%;
		animation: shimmer 1.4s infinite linear;
	}

	.poster-skeleton-img {
		width: 100%;
		aspect-ratio: 2 / 3;
	}

	.poster-skeleton-line {
		height: 12px;
	}

	.poster-skeleton-line.w-75 {
		width: 75%;
	}

	.poster-skeleton-line.w-40 {
		width: 40%;
	}

	.load-more-row {
		display: flex;
		justify-content: center;
		margin-top: var(--gap-lg);
	}

	.load-more-btn,
	.retry-btn {
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--fg);
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		padding: 10px 20px;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.15s;
	}

	.load-more-btn:hover:not(:disabled),
	.retry-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-dim);
	}

	.load-more-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.retry-btn {
		margin-top: var(--gap-md);
	}

	/* Empty & Error states */
	.empty-state {
		text-align: center;
		padding: var(--gap-xl) var(--gap-lg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.empty-state svg {
		color: var(--muted);
		margin-bottom: var(--gap-md);
	}

	.empty-state.error-state svg {
		color: var(--peer);
	}

	.empty-state h3 {
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 600;
		color: var(--fg);
		margin-bottom: var(--gap-sm);
	}

	.empty-state p {
		color: var(--muted);
		font-size: var(--fs-body);
	}

	@media (prefers-reduced-motion: reduce) {
		.poster-skeleton-img,
		.poster-skeleton-line {
			animation: none;
		}
	}
</style>
