<script lang="ts">
	import type { Torrent } from '$lib/types';
	import { fade } from 'svelte/transition';
	import { MorphIcon } from 'morphicons/svelte';
	import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Copy } from 'lucide';
	import { extractTags, getQualityTier, type TagCategory } from '$lib/utils/title-parser';

	let { results }: { results: Torrent[] } = $props();

	let sortColumn = $state('seeds');
	let sortDirection = $state('desc');
	let filterQuery = $state('');
	let selectedFilters = $state<Record<TagCategory, Set<string>>>({
		Resolution: new Set(),
		Source: new Set(),
		Codec: new Set(),
		Audio: new Set(),
		Season: new Set(),
		Other: new Set()
	});
	let isFilterMenuOpen = $state(false);
	let currentPage = $state(1);
	let copiedMagnet = $state<string | null>(null);
	const itemsPerPage = 25;

	function timeAgo(dateString: string) {
		if (!dateString) return 'unknown';
		const date = new Date(dateString);
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		let interval = seconds / 31536000;
		if (interval > 1) return Math.floor(interval) + 'y ago';
		interval = seconds / 2592000;
		if (interval > 1) return Math.floor(interval) + 'mo ago';
		interval = seconds / 86400;
		if (interval > 1) return Math.floor(interval) + 'd ago';
		interval = seconds / 3600;
		if (interval > 1) return Math.floor(interval) + 'h ago';
		interval = seconds / 60;
		if (interval > 1) return Math.floor(interval) + 'm ago';
		return Math.floor(seconds) + 's ago';
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
			Season: new Set(),
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
			Season: Array.from(tags.Season).sort(),
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
			let valA: any, valB: any;

			switch (sortColumn) {
				case 'quality':
					valA = getQualityTier(a.title).score;
					valB = getQualityTier(b.title).score;
					break;
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
			Season: new Set(),
			Other: new Set()
		};
		currentPage = 1;
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedMagnet = text;
			setTimeout(() => {
				if (copiedMagnet === text) copiedMagnet = null;
			}, 2000);
		} catch (e) {
			console.error('Failed to copy magnet link:', e);
		}
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
		Categories
		{#if isFilterMenuOpen}
			<svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
		{/if}
	</button>

	<div class="filter-input-wrapper">
		<svg class="filter-search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
		<input
			type="text"
			placeholder="Filter title results…"
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
		<button class="clear-all-btn" onclick={clearAllFilters}>
			<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			Clear all
		</button>
	</div>
{/if}

<!-- Filter panel -->
{#if isFilterMenuOpen}
	<div class="filter-panel" transition:fade={{ duration: 120 }}>
		<div class="filter-panel-inner">
			<div class="fp-header">
				<span class="fp-title">Filter Results</span>
				<div class="fp-header-actions">
					<span class="fp-count"><strong>{activeFilterCount}</strong> active</span>
					{#if activeFilterCount > 0}
						<button class="fp-clear" onclick={clearAllFilters}>
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							Clear all
						</button>
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

<!-- Sort affordance: always present, dim when the column is inactive, so headers
     never reflow. ChevronsUpDown → ChevronUp/Down morphs; asc ↔ desc is congruent
     so morphicons resolves it as a rotation. -->
{#snippet sortIcon(column: string)}
	<span class="sort-icon" class:inactive={sortColumn !== column}>
		<MorphIcon
			icon={sortColumn !== column ? ChevronsUpDown : sortDirection === 'asc' ? ChevronUp : ChevronDown}
			size={14}
			strokeWidth={2}
			reducedMotion="user"
		/>
	</span>
{/snippet}

<!-- Results table -->
<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th onclick={() => toggleSort('quality')} class="sortable col-quality">
					<div class="th-content">
						Quality
						{@render sortIcon('quality')}
					</div>
				</th>
				<th onclick={() => toggleSort('title')} class="sortable">
					<div class="th-content">
						Release Title
						{@render sortIcon('title')}
					</div>
				</th>
				<th onclick={() => toggleSort('size')} class="sortable col-size">
					<div class="th-content">
						Size
						{@render sortIcon('size')}
					</div>
				</th>
				<th onclick={() => toggleSort('seeds')} class="right sortable">
					<div class="th-content right">
						Seeds
						{@render sortIcon('seeds')}
					</div>
				</th>
				<th onclick={() => toggleSort('peers')} class="right sortable">
					<div class="th-content right">
						Peers
						{@render sortIcon('peers')}
					</div>
				</th>
				<th onclick={() => toggleSort('date')} class="right sortable">
					<div class="th-content right">
						Age
						{@render sortIcon('date')}
					</div>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each paginatedResults as result (result.magnet || result.title)}
				{@const qInfo = getQualityTier(result.title)}
				<tr transition:fade={{ duration: 150 }}>
					<td class="col-quality">
						<span class="q-badge {qInfo.badgeColor}" title={`Quality score: ${qInfo.score}`}>
							{#if qInfo.badgeColor === 'gold'}
								👑 {qInfo.tier}
							{:else if qInfo.badgeColor === 'blue'}
								💎 {qInfo.tier}
							{:else if qInfo.badgeColor === 'green'}
								⚡ {qInfo.tier}
							{:else}
								⚠️ {qInfo.tier}
							{/if}
						</span>
					</td>
					<td class="col-title">
						<div class="title-main">
							<div class="actions-group">
								{#if result.magnet}
									<a
										class="magnet-btn"
										href={result.magnet}
										title="Open Magnet Link"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
										Magnet
									</a>
									<button
										class="copy-btn {copiedMagnet === result.magnet ? 'copied' : ''}"
										onclick={() => copyToClipboard(result.magnet)}
										title="Copy Magnet Link"
									>
										<MorphIcon
											icon={copiedMagnet === result.magnet ? Check : Copy}
											size={12}
											strokeWidth={2}
											spring="snappy"
											reducedMotion="user"
										/>
									</button>
								{/if}
							</div>
							<span class="title-text" title={result.title}>{result.title}</span>
						</div>
					</td>
					<td class="col-size">{result.size}</td>
					<td class="right col-seeds">
						<span class="seed-val" class:zero={result.seeds === 0}>{result.seeds}</span>
					</td>
					<td class="right col-peers">
						<span class="peer-val" class:low={result.peers < 5}>{result.peers}</span>
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

	.filter-badge {
		background: var(--accent);
		color: #080b0f;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 700;
	}

	.filter-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		margin-left: auto;
	}

	.filter-search-icon {
		position: absolute;
		left: 10px;
		color: var(--muted);
		pointer-events: none;
	}

	.filter-input {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 5px 28px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--fg);
		outline: none;
		width: 200px;
		transition: border-color 0.15s;
	}

	.filter-input:focus {
		border-color: var(--accent);
	}

	.filter-input-clear {
		position: absolute;
		right: 8px;
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		font-size: 14px;
	}

	.results-count {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}

	.active-filters-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin-bottom: var(--gap-md);
	}

	.active-filter-chip {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 3px 8px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--fg);
		display: flex;
		align-items: center;
		gap: 4px;
		cursor: pointer;
	}

	.active-filter-chip:hover {
		border-color: var(--accent);
	}

	.clear-all-btn,
	.fp-clear {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 11px;
		padding: 3px 8px;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.clear-all-btn:hover,
	.fp-clear:hover {
		background: rgba(243, 107, 107, 0.15);
		border-color: rgba(243, 107, 107, 0.4);
		color: #F36B6B;
	}

	.filter-panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 16px;
		margin-bottom: var(--gap-md);
	}

	.fp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.fp-title {
		font-family: var(--font-display);
		font-size: 14px;
		font-weight: 600;
		color: var(--fg);
	}

	.fp-header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		font-family: var(--font-mono);
		color: var(--muted);
	}

	.fp-close {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.fp-categories {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.fp-category {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fp-cat-label {
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
	}

	.fp-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.fp-tag {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 4px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		cursor: pointer;
		transition: all 0.15s;
	}

	.fp-tag:hover {
		border-color: var(--muted);
		color: var(--fg);
	}

	.fp-tag.active {
		background: var(--accent-dim);
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}

	.table-wrap {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		text-align: left;
	}

	th {
		background: var(--surface-2);
		padding: 12px 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		border-bottom: 1px solid var(--border);
		user-select: none;
	}

	th.sortable {
		cursor: pointer;
	}

	th.sortable:hover {
		color: var(--fg);
	}

	.th-content {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.th-content.right {
		justify-content: flex-end;
	}

	td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		color: var(--fg);
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.col-quality {
		white-space: nowrap;
		width: 120px;
	}

	.q-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.q-badge.gold {
		background: rgba(245, 197, 24, 0.15);
		color: #F5C518;
		border: 1px solid rgba(245, 197, 24, 0.3);
	}

	.q-badge.blue {
		background: rgba(59, 130, 246, 0.15);
		color: #60A5FA;
		border: 1px solid rgba(59, 130, 246, 0.3);
	}

	.q-badge.green {
		background: rgba(16, 185, 129, 0.15);
		color: #34D399;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.q-badge.amber {
		background: rgba(245, 158, 11, 0.15);
		color: #FBBF24;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.col-title {
		max-width: 500px;
	}

	.title-main {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.actions-group {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.magnet-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: var(--accent-dim);
		color: var(--accent);
		border: 1px solid var(--accent);
		padding: 4px 8px;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.15s;
	}

	.magnet-btn:hover {
		background: var(--accent);
		color: #080b0f;
	}

	.copy-btn {
		background: var(--surface-2);
		border: 1px solid var(--border);
		color: var(--muted);
		padding: 4px 6px;
		border-radius: 4px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.copy-btn:hover {
		color: var(--fg);
		border-color: var(--muted);
	}

	.copy-btn.copied {
		color: #34D399;
		border-color: #34D399;
	}

	.sort-icon {
		display: inline-flex;
		transition: opacity 0.15s;
	}

	.sort-icon.inactive {
		opacity: 0.3;
	}

	.sortable:hover .sort-icon.inactive {
		opacity: 0.6;
	}

	.title-text {
		font-family: var(--font-mono);
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.col-size {
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}

	.right {
		text-align: right;
	}

	.seed-val {
		font-family: var(--font-mono);
		font-weight: 600;
		color: #34D399;
	}

	.seed-val.zero {
		color: var(--muted);
	}

	.peer-val {
		font-family: var(--font-mono);
		color: var(--fg);
	}

	.peer-val.low {
		color: var(--muted);
	}

	.col-age {
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin-top: 20px;
	}

	.pagination button {
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--fg);
		padding: 6px 14px;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
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
</style>