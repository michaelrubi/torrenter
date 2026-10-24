<script lang="ts">
	let { title, posterUrl, year, voteAverage, onClick, onSearchClick } = $props<{
		title: string;
		posterUrl: string;
		year: string;
		voteAverage?: number;
		onClick?: () => void;
		onSearchClick?: (e: MouseEvent) => void;
	}>();
</script>

<article class="poster-card">
	<div class="img-wrap">
		<button
			type="button"
			class="poster-trigger"
			onclick={onClick}
			aria-label="View details for {title}"
		>
			{#if posterUrl}
				<img src={posterUrl} alt={title} loading="lazy" />
			{:else}
				<div class="no-img">No Image</div>
			{/if}
		</button>

		{#if voteAverage}
			<div class="rating-badge" aria-label="Rating {voteAverage} out of 10">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="#F5C518"
					stroke="#F5C518"
					stroke-width="2"
					aria-hidden="true"
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					/>
				</svg>
				<span>{voteAverage}</span>
			</div>
		{/if}

		<div class="card-overlay">
			<button type="button" class="overlay-btn primary" onclick={() => onClick?.()}>
				Details
			</button>
			{#if onSearchClick}
				<button type="button" class="overlay-btn secondary" onclick={(e) => onSearchClick(e)}>
					Search Torrents
				</button>
			{/if}
		</div>
	</div>

	<button type="button" class="card-title-btn" onclick={onClick} {title}>
		{title}
	</button>
	<div class="card-meta">
		<span>{year || '—'}</span>
		{#if onSearchClick}
			<button
				type="button"
				class="quick-search-btn"
				onclick={(e) => onSearchClick(e)}
				title="Search torrents for {title}"
				aria-label="Search torrents for {title}"
			>
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
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<span>Torrents</span>
			</button>
		{/if}
	</div>
</article>

<style>
	.poster-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--gap-sm);
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.poster-card:hover,
	.poster-card:focus-within {
		border-color: var(--accent);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.img-wrap {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 3;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		flex-shrink: 0;
	}

	.poster-trigger {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.img-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.3s ease;
	}

	.poster-card:hover .img-wrap img,
	.poster-card:focus-within .img-wrap img {
		transform: scale(1.04);
	}

	.rating-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		background: rgba(15, 18, 25, 0.85);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(245, 197, 24, 0.3);
		border-radius: 4px;
		padding: 2px 6px;
		display: flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #f5c518;
		z-index: 2;
		pointer-events: none;
	}

	.card-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 14, 22, 0.78);
		backdrop-filter: blur(3px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease;
		padding: 12px;
		z-index: 3;
	}

	.poster-card:hover .card-overlay,
	.poster-card:focus-within .card-overlay {
		opacity: 1;
		pointer-events: auto;
	}

	.overlay-btn {
		width: 100%;
		padding: 7px 12px;
		border-radius: var(--radius-sm);
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
	}

	.overlay-btn.primary {
		background: var(--accent);
		color: #080b0f;
	}

	.overlay-btn.primary:hover {
		opacity: 0.9;
		transform: scale(1.02);
	}

	.overlay-btn.secondary {
		background: rgba(255, 255, 255, 0.12);
		color: var(--fg);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.overlay-btn.secondary:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.no-img {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		text-transform: uppercase;
	}

	.card-title-btn {
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--fg);
		margin-top: var(--gap-sm);
		line-height: 1.3;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-title-btn:hover {
		color: var(--accent);
	}

	.card-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
		margin-top: auto;
		padding-top: 6px;
		gap: 6px;
	}

	.quick-search-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 10px;
		padding: 2px 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quick-search-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-dim);
	}

	@media (hover: none) {
		.card-overlay {
			display: none;
		}
		.quick-search-btn {
			color: var(--accent);
			border-color: rgba(0, 212, 184, 0.35);
		}
	}
</style>
