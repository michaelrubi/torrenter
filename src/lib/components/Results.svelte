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

			for (const category of Object.keys(selectedFilters) as TagCategory[]) {
				const categoryFilters = selectedFilters[category];
				if (categoryFilters.size === 0) continue;

				const hasMatch = titleTags[category].some((tag) => categoryFilters.has(tag));
				if (!hasMatch) return false;
			}

			return true;
		})
	);

	$effect(() => {
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

<!-- Filter row -->
<div class="filter-row">
	<span class="filter-chip-label">
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
		Filters
	</span>

	<button
		class="filter-chip {isFilterMenuOpen ? 'open' : ''}"
		onclick={() => (isFilterMenuOpen = !isFilterMenuOpen)}
	>
		{#if activeFilterCount > 0}
			<span class="filter-badge">{activeFilterCount}</span>
		{/if}
		{#if isFilterMenuOpen}
			<svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
		{/if}
	</button>

	<div class="filter-input-wrapper">
		<svg class="filter-search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
		<input
			type="text"
			placeholder="Filter results…"
			bind:value={filterQuery}
			class="filter-input"
		/>
		{#if filterQuery}
			<button class="filter-input-clear" onclick={() => (filterQuery = '')} aria-label="Clear">
				×
			</button>
		{/if}
	</div>

	<span class="results-count">
		{filteredResults.length}/{results.length} results
	</span>
</div>

<!-- Active filter chips -->
{#if activeFilterCount > 0}
	<div class="active-filters-bar" transition:fade={{ duration: 150 }}>
		{#each Object.keys(selectedFilters) as key}
			{@const category = key as TagCategory}
			{#each selectedFilters[category] as tag}
				<button class="active-filter-chip" onclick={() => toggleFilter(category, tag)}>
					{tag}
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			{/each}
		{/each}
		<button class="clear-all-btn" onclick={clearAllFilters}>Clear all</button>
	</div>
{/if}

<!-- Filter panel -->
{#if isFilterMenuOpen}
	<div class="filter-panel">
		<div class="filter-panel-inner">
			<div class="fp-header">
				<span class="fp-title">Filter Results</span>
				<div class="fp-header-actions">
					<span class="fp-count"><strong>{activeFilterCount}</strong> active</span>
					{#if activeFilterCount > 0}
						<button class="fp-clear" onclick={clearAllFilters}>Clear all</button>
					{/if}
					<button class="fp-close" onclick={() => (isFilterMenuOpen = false)} aria-label="Close">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>

			<div class="fp-categories">
				{#each categories as category}
					{#if availableTags[category].length > 0}
						<div class="fp-category">
							<div class="fp-cat-label">{category}</div>
							<div class="fp-tags">
								{#each availableTags[category] as tag}
									<button
										class="fp-tag {selectedFilters[category].has(tag) ? 'active' : ''}"
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
	</div>
{/if}

<!-- Results table -->
<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th onclick={() => toggleSort('title')} class="sortable">
					<div class="th-content">
						Title
						{#if sortColumn === 'title'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
								{/if}
							</span>
						{/if}
					</div>
				</th>
				<th onclick={() => toggleSort('size')} class="sortable col-size">
					<div class="th-content">
						Size
						{#if sortColumn === 'size'}
							<span class="sort-icon">
								{#if sortDirection === 'asc'}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
					<td class="col-title">
						<div class="title-main">
							{#if result.magnet}
														<a
															class="magnet-btn"
															href={result.magnet}
															title="Open in torrent client"
														>
															<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
															Magnet
														</a>
													{/if}
							<span class="title-text">{result.title}</span>
						</div>
					</td>
					<td class="col-size">{result.size}</td>
					<td class="right col-seeds">
						<span class="seed-val">{result.seeds}</span>
					</td>
					<td class="right col-peers">
						<span class="peer-val" class:low={result.peers < 10}>{result.peers}</span>
					</td>
					<td class="right col-age">{timeAgo(result.publishDate)}</td>
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
	/* Filter row */
	.filter-row {
		display: flex;
		align-items: center;
		gap: var(--gap-sm);
		margin-bottom: var(--gap-md);
		flex-wrap: wrap;
	}

	.filter-chip-label {
		font-family: var(--font-mono);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.filter-chip {
		background: none;
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 5px 12px;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.filter-chip:hover {
		border-color: var(--muted);
		color: var(--fg);
	}

	.filter-chip.open {
		background: var(--accent-dim);
		border-color: var(--accent);
		color: var(--accent);
	}

	.chevron {
		transition: transform 0.2s ease;
	}

	.filter-chip.open .chevron {
		transform: rotate(180deg);
	}

	.filter-badge {
		background: var(--accent);
		color: #080B0F;
		border-radius: 999px;
		min-width: 18px;
		height: 18px;
		font-size: 10px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 5px;
	}

	.filter-input-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--gap-sm);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 7px 10px;
		transition: border-color 0.15s;
		min-width: 200px;
	}

	.filter-input-wrapper:focus-within {
		border-color: var(--accent);
	}

	.filter-search-icon {
		color: var(--muted);
		flex-shrink: 0;
	}

	.filter-input {
		background: none;
		border: none;
		outline: none;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--fg);
		width: 100%;
	}

	.filter-input::placeholder {
		color: var(--muted);
	}

	.filter-input-clear {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		font-size: 14px;
		font-family: var(--font-mono);
		transition: color 0.15s;
	}

	.filter-input-clear:hover {
		color: var(--fg);
	}

	.results-count {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
	}

	/* Active filters */
	.active-filters-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: var(--gap-md);
		align-items: center;
	}

	.active-filter-chip {
		display: flex;
		align-items: center;
		gap: 5px;
		background: var(--accent-dim);
		border: 1px solid var(--accent);
		color: var(--accent);
		padding: 4px 10px;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: all 0.15s;
	}

	.active-filter-chip:hover {
		background: color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.clear-all-btn {
		background: none;
		border: none;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: color 0.15s;
	}

	.clear-all-btn:hover {
		color: var(--fg);
	}

	/* Filter panel */
	.filter-panel {
		margin-bottom: var(--gap-md);
	}

	.filter-panel-inner {
		background: var(--surface);
		border: 1px solid var(--border);
		border-top: none;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		padding: var(--gap-md);
	}

	.fp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--gap-md);
		padding-bottom: var(--gap-md);
		border-bottom: 1px solid var(--border);
	}

	.fp-title {
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 600;
		color: var(--fg);
	}

	.fp-header-actions {
		display: flex;
		align-items: center;
		gap: var(--gap-md);
	}

	.fp-count {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
	}

	.fp-count strong {
		color: var(--accent);
		font-weight: 500;
	}

	.fp-clear {
		background: none;
		border: none;
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: color 0.15s, background 0.15s;
	}

	.fp-clear:hover {
		color: var(--fg);
		background: var(--surface-2);
	}

	.fp-close {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}

	.fp-close:hover {
		color: var(--fg);
	}

	.fp-categories {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--gap-md);
	}

	@media (max-width: 600px) {
		.fp-categories { grid-template-columns: 1fr; }
	}

	.fp-category {
		display: flex;
		flex-direction: column;
		gap: var(--gap-xs);
	}

	.fp-cat-label {
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted);
		margin-bottom: var(--gap-xs);
	}

	.fp-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.fp-tag {
		background: none;
		border: 1px solid var(--border);
		border-radius: 5px;
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		padding: 4px 9px;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;
	}

	.fp-tag:hover:not(.active) {
		border-color: var(--muted);
		color: var(--fg);
	}

	.fp-tag.active {
		background: var(--accent-dim);
		border-color: var(--accent);
		color: var(--accent);
	}

	/* Results table */
	.table-wrap {
		overflow-x: auto;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-body);
		font-size: var(--fs-body);
	}

	thead {
		background: var(--surface-2);
		border-bottom: 1px solid var(--border);
	}

	th {
		text-align: left;
		padding: 10px 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
	}

	th:hover {
		color: var(--fg);
	}

	.sort-icon {
		opacity: 0.4;
		margin-left: 4px;
		vertical-align: middle;
		display: inline-flex;
		align-items: center;
	}

	:global(th.sorted) .sort-icon,
	th:hover .sort-icon {
		opacity: 1;
		color: var(--accent);
	}

	td {
		padding: 10px 14px;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr {
		background: var(--surface);
		transition: background 0.1s;
	}

	tr:hover {
		background: var(--surface-2);
	}

	.col-title {
		max-width: 480px;
	}

	.title-main {
		font-weight: 500;
		color: var(--fg);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.title-text {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.col-size,
	.col-age {
		font-family: var(--font-mono);
		font-size: var(--fs-data);
		color: var(--muted);
		white-space: nowrap;
	}

	.col-seeds,
	.col-peers {
		font-family: var(--font-mono);
		font-size: var(--fs-data);
		white-space: nowrap;
	}

	.seed-val {
		color: var(--seed);
		font-weight: 500;
	}

	.peer-val {
		color: var(--peer);
	}

	.peer-val.low {
		color: var(--muted);
	}

	/* Magnet button */
	.magnet-btn {
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--muted);
		padding: 5px 10px;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		display: flex;
		align-items: center;
		gap: 5px;
		transition: all 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.magnet-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-dim);
	}

	.magnet-btn.copied {
		border-color: var(--seed);
		color: var(--seed);
		background: color-mix(in srgb, var(--seed) 12%, transparent);
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--gap-md);
		margin-top: var(--gap-md);
		padding-bottom: var(--gap-xl);
	}

	.pagination button {
		background: none;
		border: 1px solid var(--border);
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.15s;
	}

	.pagination button:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.page-info {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}

	.right {
		text-align: right;
	}
</style>