<script lang="ts">
	import Results from '$lib/components/Results.svelte';
	import SkeletonResults from '$lib/components/SkeletonResults.svelte';
	import MediaCard from '$lib/components/MediaCard.svelte';
	import { searchTorrents, getDiscoveryContent } from './data.remote';
	import type { DiscoveryItem } from '$lib/types';
	import { onMount } from 'svelte';

	let searchTerm = $state('');
	let results: any[] = $state([]);
	let discoveryResults: DiscoveryItem[] = $state([]);
	let loading = $state(false);
	let hasSearched = $state(false);

	let mediaType: 'movie' | 'tv' = $state('movie');
	let hasDiscoveryLoaded = $state(false);

	$effect(() => {
		// Fetch new content when mediaType changes
		// Use an IIFE to handle async in effect
		(async () => {
			discoveryResults = await getDiscoveryContent({ page: 1, mediaType });
		})();
	});

	let formElement: HTMLFormElement;

	async function handleSearch(e: Event) {
		e.preventDefault();
		if (!searchTerm.trim()) return;

		loading = true;
		hasSearched = true;
		results = [];

		try {
			results = await searchTorrents(searchTerm);
		} catch (error) {
			console.error('Search failed:', error);
			// Optional: Add error handling UI
		} finally {
			loading = false;
		}
	}
</script>

<div class="main-layout center-content">
	<div class="search-wrapper">
		<h1 class="greeting">Movie & TV Show Search</h1>

		<form bind:this={formElement} onsubmit={handleSearch} class="search-form">
			<div class="input-group">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search for a movie or TV show..."
					class="search-input"
				/>
				{#if searchTerm}
					<button
						type="button"
						class="clear-button"
						onclick={() => (searchTerm = '')}
						aria-label="Clear search"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
						>
					</button>
				{/if}
				<button type="submit" class="search-button" disabled={loading}> Search </button>
			</div>
		</form>

		{#if loading}
			<SkeletonResults />
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
					class="empty-icon"
					><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" /></svg
				>
				<p class="no-results">No results found for "{searchTerm}"</p>
				<p class="empty-hint">Try adjusting your search terms or check your spelling.</p>
			</div>
		{:else if hasSearched && results.length > 0}
			<Results {results} />
		{:else if !hasSearched && !searchTerm}
			<div class="discovery-section">
				<div class="discovery-header">
					<h2 class="section-title">
						Popular {mediaType === 'movie' ? 'Movies' : 'TV Shows'} to Stream
					</h2>
					<div class="toggle-group">
						<button
							class="toggle-btn {mediaType === 'movie' ? 'active' : ''}"
							onclick={() => (mediaType = 'movie')}
						>
							Movies
						</button>
						<button
							class="toggle-btn {mediaType === 'tv' ? 'active' : ''}"
							onclick={() => (mediaType = 'tv')}
						>
							TV Shows
						</button>
					</div>
				</div>
				<div class="media-grid">
					{#each discoveryResults as item (item.id)}
						<MediaCard
							title={item.title}
							posterUrl={item.posterPath}
							year={new Date(item.releaseDate).getFullYear().toString()}
							onClick={() => {
								searchTerm = item.title;
								// Trigger search next tick to ensure hydration/state update
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
	.main-layout {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.greeting {
		font-size: 2.5rem;
		margin-bottom: 2rem;
		background: linear-gradient(to right, #fff, #a1a1aa);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		text-align: center;
	}

	.search-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.search-form {
		width: 100%;
		max-width: 100%;
		margin-bottom: 2rem;
	}

	.input-group {
		position: relative;
		display: flex;
		align-items: center;
		background-color: var(--surface-color);
		border-radius: 12px;
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		transition: border-color 0.2s;
	}

	.input-group:focus-within {
		border-color: var(--accent-color);
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--text-primary);
		padding: 1rem;
		outline: none;
		font-size: 1.1rem;
	}

	.clear-button {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s;
		margin-right: 0.5rem;
	}

	.clear-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.search-button {
		background-color: var(--surface-color); /* Match input bg */
		color: var(--text-secondary);
		border: none;
		padding: 0.8rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.search-button:hover:not(:disabled) {
		background-color: var(--accent-color);
		color: white;
	}

	.search-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin-top: 4rem;
		color: var(--text-secondary);
		text-align: center;
	}

	.empty-icon {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.no-results {
		font-size: 1.2rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.empty-hint {
		font-size: 0.9rem;
		opacity: 0.7;
	}

	.discovery-section {
		width: 100%;
		margin-top: 2rem;
	}

	.section-title {
		font-size: 1.5rem;
		color: var(--text-primary);
		margin: 0;
	}

	.discovery-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.toggle-group {
		display: flex;
		background-color: var(--surface-color);
		padding: 0.25rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
	}

	.toggle-btn {
		background: none;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		color: var(--text-secondary);
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.toggle-btn.active {
		background-color: var(--accent-color);
		color: white;
	}

	.toggle-btn:hover:not(.active) {
		color: var(--text-primary);
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1.5rem;
	}
</style>
