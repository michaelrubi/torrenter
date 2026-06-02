<script lang="ts">
	import Results from '$lib/components/Results.svelte';
	import SkeletonResults from '$lib/components/SkeletonResults.svelte';
	import MediaCard from '$lib/components/MediaCard.svelte';
	import { searchTorrents, getDiscoveryContent } from './data.remote';
	import type { DiscoveryItem } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let searchTerm = $state('');
	let results: any[] = $state([]);
	let discoveryResults: DiscoveryItem[] = $state([]);
	let loading = $state(false);
	let hasSearched = $state(false);
	let mediaType: 'movie' | 'tv' = $state('movie');

	let formElement: HTMLFormElement;
	let lastQuery = '';

	$effect(() => {
		const q = page.url.searchParams.get('search') || '';
		if (q !== lastQuery) {
			lastQuery = q;
			searchTerm = q;
			if (q) {
				performSearch(q);
			} else {
				resetSearch();
			}
		} else if (!q && !hasSearched && discoveryResults.length === 0 && !loading) {
			loadDiscovery();
		}
	});

	$effect(() => {
		const q = page.url.searchParams.get('search');
		if (!q && !loading) {
			loadDiscovery();
		}
	});

	async function loadDiscovery() {
		try {
			const data = await getDiscoveryContent({ page: 1, mediaType });
			discoveryResults = data;
		} catch (e) {
			console.error('Discovery load failed', e);
		}
	}

	function resetSearch() {
		searchTerm = '';
		hasSearched = false;
		results = [];
		loadDiscovery();
	}

	async function performSearch(term: string) {
		loading = true;
		hasSearched = true;
		results = [];
		try {
			results = await searchTorrents(term);
		} catch (error) {
			console.error('Search failed:', error);
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleSearch(e: Event) {
		e.preventDefault();
		const trimmed = searchTerm.trim();
		goto(`/?search=${encodeURIComponent(trimmed)}`, { keepFocus: true });
	}
</script>

<div class="page-body">
	<!-- Search Section -->
	<div class="search-section">
		<div class="search-wrapper">
			<form bind:this={formElement} onsubmit={handleSearch} class="search-form">
				<div class="search-input-row">
					<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search movies or TV shows…"
						class="search-input"
						aria-label="Search"
					/>
					<button type="submit" class="search-btn" disabled={loading}>Search</button>
				</div>
			</form>

			<!-- Segmented control -->
			<div class="segmented">
				<button
					class="seg-btn {mediaType === 'movie' ? 'active' : ''}"
					onclick={() => (mediaType = 'movie')}
				>Movies</button>
				<button
					class="seg-btn {mediaType === 'tv' ? 'active' : ''}"
					onclick={() => (mediaType = 'tv')}
				>TV Shows</button>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="content-section">
		{#if loading}
			<SkeletonResults />
		{:else if hasSearched && results.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>
				<h3>No results found</h3>
				<p>Try adjusting your search terms</p>
			</div>
		{:else if hasSearched && results.length > 0}
			<Results {results} />
		{:else if !hasSearched && !searchTerm}
			<div class="discovery-section">
				<p class="section-label">Popular {mediaType === 'movie' ? 'Movies' : 'TV Shows'}</p>
				<div class="grid">
					{#each discoveryResults as item (item.id)}
						<MediaCard
							title={item.title}
							posterUrl={item.posterPath}
							year={new Date(item.releaseDate).getFullYear().toString()}
							onClick={() => {
								searchTerm = item.title;
								setTimeout(() => formElement?.requestSubmit(), 0);
							}}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

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
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.search-input-row:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-dim);
	}

	.search-icon {
		color: var(--muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
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

	.search-btn {
		background: var(--accent);
		color: #080B0F;
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

	/* Content */
	.content-section {
		padding-bottom: var(--gap-xl);
	}

	/* Discovery */
	.discovery-section {
		width: 100%;
	}

	.section-label {
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted);
		margin-bottom: var(--gap-md);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 20px;
	}

	@media (min-width: 640px) {
		.grid { grid-template-columns: repeat(3, 1fr); }
	}
	@media (min-width: 1024px) {
		.grid { grid-template-columns: repeat(4, 1fr); }
	}
	@media (min-width: 1440px) {
		.grid { grid-template-columns: repeat(5, 1fr); }
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--gap-xl) var(--gap-lg);
	}

	.empty-state svg {
		color: var(--muted);
		margin-bottom: var(--gap-md);
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
</style>