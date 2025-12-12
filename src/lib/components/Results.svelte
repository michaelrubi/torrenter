<script lang="ts">
	import type { Torrent } from '$lib/types';
	import { fade, scale } from 'svelte/transition';
	import { extractTags, type TagCategory } from '$lib/utils/title-parser';

	let { results }: { results: Torrent[] } = $props();

	let sortColumn = $state('seeds');
	let sortDirection = $state('desc');
	let filterQuery = $state('');
	let selectedFilters = $state<Record<TagCategory, Set<string>>>({
		Resolution: new Set(),
		Source: new Set(),
		Codec: new Set(),
		Audio: new Set(),
		Other: new Set()
	});
	let isFilterMenuOpen = $state(false);
	let currentPage = $state(1);
	let copiedMagnet = $state<string | null>(null);
	const itemsPerPage = 20;

	function timeAgo(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		let interval = seconds / 31536000;
		if (interval > 1) return Math.floor(interval) + ' years ago';
		interval = seconds / 2592000;
		if (interval > 1) return Math.floor(interval) + ' months ago';
		interval = seconds / 86400;
		if (interval > 1) return Math.floor(interval) + ' days ago';
		interval = seconds / 3600;
		if (interval > 1) return Math.floor(interval) + ' hours ago';
		interval = seconds / 60;
		if (interval > 1) return Math.floor(interval) + ' minutes ago';
		return Math.floor(seconds) + ' seconds ago';
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedMagnet = text;
			setTimeout(() => {
				copiedMagnet = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function toggleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'desc';
		}
	}

	function toggleFilter(category: TagCategory, tag: string) {
		const newCategorySet = new Set(selectedFilters[category]);
		if (newCategorySet.has(tag)) {
			newCategorySet.delete(tag);
		} else {
			newCategorySet.add(tag);
		}

		selectedFilters = {
			...selectedFilters,
			[category]: newCategorySet
		};
		currentPage = 1;
	}

	let availableTags = $derived.by(() => {
		const tags: Record<TagCategory, Set<string>> = {
			Resolution: new Set(),
			Source: new Set(),
			Codec: new Set(),
			Audio: new Set(),
			Other: new Set()
		};

		results.forEach((r) => {
			const extracted = extractTags(r.title);
			(Object.keys(extracted) as TagCategory[]).forEach((category) => {
				extracted[category].forEach((tag) => tags[category].add(tag));
			});
		});

		return {
			Resolution: Array.from(tags.Resolution).sort(),
			Source: Array.from(tags.Source).sort(),
			Codec: Array.from(tags.Codec).sort(),
			Audio: Array.from(tags.Audio).sort(),
			Other: Array.from(tags.Other).sort()
		};
	});

	let categories = $derived(Object.keys(availableTags) as TagCategory[]);

	let filteredResults = $derived(
		results.filter((r) => {
			const matchesQuery = filterQuery
				? r.title.toLowerCase().includes(filterQuery.toLowerCase())
				: true;

			if (!matchesQuery) return false;

			const hasAnyFilter = Object.values(selectedFilters).some((set) => set.size > 0);
			if (!hasAnyFilter) return true;

			const titleTags = extractTags(r.title);

			// Check each category
			for (const category of Object.keys(selectedFilters) as TagCategory[]) {
				const categoryFilters = selectedFilters[category];
				if (categoryFilters.size === 0) continue;

				// OR logic within category: Title must have AT LEAST ONE of the selected tags in this category
				const hasMatch = titleTags[category].some((tag) => categoryFilters.has(tag));
				if (!hasMatch) return false;
			}

			return true;
		})
	);

	$effect(() => {
		// Reset to first page when filter changes
		if (filterQuery || !filterQuery) {
			currentPage = 1;
		}
	});

	let sortedResults = $derived(
		[...filteredResults].sort((a, b) => {
			let valA, valB;

			switch (sortColumn) {
				case 'size':
					valA = a.sizeBytes;
					valB = b.sizeBytes;
					break;
				case 'date':
					valA = new Date(a.publishDate).getTime();
					valB = new Date(b.publishDate).getTime();
					break;
				case 'seeds':
					valA = a.seeds;
					valB = b.seeds;
					break;
				case 'peers':
					valA = a.peers;
					valB = b.peers;
					break;
				default:
					valA = a.title;
					valB = b.title;
			}

			if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
			if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		})
	);

	let paginatedResults = $derived(
		sortedResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(sortedResults.length / itemsPerPage));
	let activeFilterCount = $derived(
		Object.values(selectedFilters).reduce((acc, set) => acc + set.size, 0)
	);

	function clearAllFilters() {
		selectedFilters = {
			Resolution: new Set(),
			Source: new Set(),
			Codec: new Set(),
			Audio: new Set(),
			Other: new Set()
		};
		currentPage = 1;
	}
</script>

<div class="filter-container">
	<div class="filter-input-wrapper">
		<input
			type="text"
			placeholder="Filter results..."
			bind:value={filterQuery}
			class="filter-input"
		/>
		{#if filterQuery}
			<button class="clear-filter-btn" onclick={() => (filterQuery = '')} aria-label="Clear filter">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
				>
			</button>
		{/if}
	</div>

	<button
		class="filter-toggle-btn {isFilterMenuOpen ? 'active' : ''}"
		onclick={() => (isFilterMenuOpen = !isFilterMenuOpen)}
		title="Toggle Filters"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg
		>
		{#if activeFilterCount > 0}
			<span class="filter-badge">{activeFilterCount}</span>
		{/if}
	</button>

	<span class="results-count">
		{filteredResults.length}/{results.length} results found
	</span>
</div>

{#if activeFilterCount > 0}
	<div class="active-filters-bar" transition:fade={{ duration: 150 }}>
		{#each Object.keys(selectedFilters) as key}
			{@const category = key as TagCategory}
			{#each selectedFilters[category] as tag}
				<button class="active-filter-chip" onclick={() => toggleFilter(category, tag)}>
					{tag}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
						></line></svg
					>
				</button>
			{/each}
		{/each}
		<button class="clear-all-btn" onclick={clearAllFilters}>Clear all</button>
	</div>
{/if}

{#if isFilterMenuOpen}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 200 }}
		onclick={() => (isFilterMenuOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isFilterMenuOpen = false)}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	></div>
	<div
		class="filters-modal"
		transition:scale={{ duration: 200, start: 0.95 }}
		role="dialog"
		aria-modal="true"
	>
		<div class="filters-header">
			<h3>Filters</h3>
			<div class="header-actions">
				{#if activeFilterCount > 0}
					<button class="clear-all-text-btn" onclick={clearAllFilters}>Clear all</button>
				{/if}
				<button
					class="close-modal-btn"
					onclick={() => (isFilterMenuOpen = false)}
					aria-label="Close filters"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
						></line></svg
					>
				</button>
			</div>
		</div>
		<div class="filters-grid">
			{#each categories as category}
				{#if availableTags[category].length > 0}
					<div class="filter-group">
						<div class="filter-group-title">{category}</div>
						<div class="tags-filter">
							{#each availableTags[category] as tag}
								<button
									class="tag-btn {selectedFilters[category].has(tag) ? 'active' : ''}"
									onclick={() => toggleFilter(category, tag)}
								>
									{tag}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<div class="table-container">
	<table>
		<thead>
			<tr>
				<th onclick={() => toggleSort('title')} class="sortable">
					<div class="th-content">
						Title
						{#if sortColumn === 'title'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
									>
								{/if}
							</span>
						{/if}
					</div>
				</th>
				<th onclick={() => toggleSort('size')} class="sortable">
					<div class="th-content">
						Size
						{#if sortColumn === 'size'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
									>
								{/if}
							</span>
						{/if}
					</div>
				</th>
				<th onclick={() => toggleSort('seeds')} class="right sortable">
					<div class="th-content right">
						Seeds
						{#if sortColumn === 'seeds'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
									>
								{/if}
							</span>
						{/if}
					</div>
				</th>
				<th onclick={() => toggleSort('peers')} class="right sortable">
					<div class="th-content right">
						Peers
						{#if sortColumn === 'peers'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
									>
								{/if}
							</span>
						{/if}
					</div>
				</th>
				<th onclick={() => toggleSort('date')} class="right sortable">
					<div class="th-content right">
						Age
						{#if sortColumn === 'date'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
									>
								{/if}
							</span>
						{/if}
					</div>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each paginatedResults as result (result.magnet || result.title)}
				<tr transition:fade={{ duration: 200 }}>
					<td class="title">
						<div class="title-content">
							{#if result.magnet}
								<button
									class="copy-btn"
									onclick={() => copyToClipboard(result.magnet)}
									title="Copy Magnet Link"
								>
									{#if copiedMagnet === result.magnet}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg
										>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
											></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
											></path></svg
										>
									{/if}
								</button>
								<a href={result.magnet} title={result.title}>
									{result.title}
								</a>
							{:else}
								<span title={result.title}>{result.title}</span>
							{/if}
						</div>
					</td>
					<td class="size">{result.size}</td>
					<td class="seeds right">{result.seeds}</td>
					<td class="peers right">{result.peers}</td>
					<td class="date right" title={result.date}>{timeAgo(result.publishDate)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if totalPages > 1}
	<div class="pagination">
		<button
			disabled={currentPage === 1}
			onclick={() => (currentPage = Math.max(1, currentPage - 1))}
		>
			Previous
		</button>
		<span class="page-info">
			Page {currentPage} of {totalPages}
		</span>
		<button
			disabled={currentPage === totalPages}
			onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
		>
			Next
		</button>
	</div>
{/if}

<style>
	.table-container {
		width: 100%;
		overflow-x: auto;
		margin-top: 2rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background-color: var(--surface-color);
	}

	.filter-container {
		margin-top: 2rem;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		cursor: pointer;
		position: relative;
		transition: all 0.2s;
	}

	.filter-toggle-btn:hover {
		border-color: var(--accent-color);
		color: var(--text-primary);
	}

	.filter-toggle-btn.active {
		background-color: var(--accent-color);
		border-color: var(--accent-color);
		color: white;
	}

	.filter-badge {
		position: absolute;
		top: -5px;
		right: -5px;
		background-color: var(--accent-color);
		color: white;
		font-size: 0.7rem;
		font-weight: bold;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--background-color);
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		z-index: 100;
	}

	.filters-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2rem;
		width: 90%;
		max-width: 800px;
		max-height: 85vh;
		overflow-y: auto;
		z-index: 101;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		position: sticky;
		top: -2rem; /* Compensate for padding */
		background-color: var(--surface-color);
		z-index: 10;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	.filters-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.close-modal-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.close-modal-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.clear-all-text-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
	}

	.clear-all-text-btn:hover {
		color: var(--accent-color);
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 2rem;
	}

	.active-filters-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
		align-items: center;
	}

	.active-filter-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: rgba(var(--accent-color-rgb), 0.15);
		border: 1px solid var(--accent-color);
		color: var(--accent-color);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.active-filter-chip:hover {
		background-color: rgba(var(--accent-color-rgb), 0.25);
	}

	.clear-all-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
		margin-left: 0.5rem;
	}

	.clear-all-btn:hover {
		color: var(--text-primary);
		text-decoration: underline;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-group-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tags-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tag-btn {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tag-btn:hover {
		border-color: var(--accent-color);
		color: var(--text-primary);
	}

	.tag-btn.active {
		background-color: var(--accent-color);
		color: white;
		border-color: var(--accent-color);
	}

	.filter-input-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
	}

	.filter-input {
		width: 100%;
		padding: 0.75rem 1rem;
		padding-right: 2.5rem; /* Space for clear button */
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background-color: var(--surface-color);
		color: var(--text-primary);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.filter-input:focus {
		border-color: var(--accent-color);
	}

	.clear-filter-btn {
		position: absolute;
		right: 0.5rem;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.clear-filter-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.results-count {
		color: var(--text-secondary);
		font-size: 0.9rem;
		white-space: nowrap;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border-color);
	}

	th {
		background-color: var(--surface-color); /* Opaque background for sticky */
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		user-select: none;
		transition: background-color 0.2s;
		position: sticky;
		top: 0;
		z-index: 10;
		box-shadow: 0 1px 0 var(--border-color); /* Border bottom replacement */
	}

	th:hover {
		background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter than surface */
		color: var(--text-primary);
	}

	.th-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.th-content.right {
		justify-content: flex-end;
	}

	.sort-icon {
		display: flex;
		align-items: center;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr:hover {
		background-color: rgba(255, 255, 255, 0.02);
	}

	.title {
		min-width: 300px;
	}

	.title-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.copy-btn {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-secondary);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		opacity: 0.6;
	}

	.copy-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		opacity: 1;
	}

	.text-green-500 {
		color: #4ade80;
	}

	.title a {
		color: var(--text-primary);
		text-decoration: none;
		font-weight: 500;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		transition: color 0.2s;
	}

	.title a:hover {
		color: var(--accent-color);
	}

	.size {
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.seeds {
		color: #4ade80;
	}

	.peers {
		color: #f87171;
	}

	.date {
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.right {
		text-align: right;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-bottom: 2rem;
	}

	.pagination button {
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color);
		background-color: var(--surface-color);
		color: var(--text-primary);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.pagination button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.05);
		border-color: var(--accent-color);
	}

	.pagination button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
