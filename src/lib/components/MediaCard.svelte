<script lang="ts">
	let {
		title,
		posterUrl,
		year,
		voteAverage,
		onClick,
		onSearchClick
	} = $props<{
		title: string;
		posterUrl: string;
		year: string;
		voteAverage?: number;
		onClick?: () => void;
		onSearchClick?: (e: MouseEvent) => void;
	}>();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="poster-card" onclick={onClick} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onClick?.()}>
	<div class="img-wrap">
		{#if posterUrl}
			<img src={posterUrl} alt={title} loading="lazy" />
		{:else}
			<div class="no-img">No Image</div>
		{/if}

		{#if voteAverage}
			<div class="rating-badge">
				<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
				<span>{voteAverage}</span>
			</div>
		{/if}

		<div class="card-overlay">
			<button class="overlay-btn primary" onclick={(e) => { e.stopPropagation(); onClick?.(); }}>
				Details
			</button>
			{#if onSearchClick}
				<button class="overlay-btn secondary" onclick={(e) => { e.stopPropagation(); onSearchClick(e); }}>
					Search
				</button>
			{/if}
		</div>
	</div>

	<div class="card-title" title={title}>{title}</div>
	<div class="card-meta">
		<span>{year}</span>
	</div>
</div>

<style>
	.poster-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--gap-sm);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.poster-card:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.poster-card:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.img-wrap {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		flex-shrink: 0;
	}

	.img-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.3s ease;
	}

	.poster-card:hover .img-wrap img {
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
		color: #F5C518;
		z-index: 2;
	}

	.card-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 14, 22, 0.75);
		backdrop-filter: blur(3px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		opacity: 0;
		transition: opacity 0.2s ease;
		padding: 12px;
		z-index: 3;
	}

	.poster-card:hover .card-overlay {
		opacity: 1;
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

	.card-title {
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

	.card-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		margin-top: auto;
		padding-top: 4px;
	}
</style>