<script lang="ts">
	let { title, posterUrl, year, onClick } = $props<{
		title: string;
		posterUrl: string;
		year: string;
		onClick?: () => void;
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
	</div>
	<div class="card-title">{title}</div>
	<div class="card-meta">{year}</div>
</div>

<style>
	.poster-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--gap-sm);
		cursor: pointer;
		transition: border-color 0.15s;
		display: flex;
		flex-direction: column;
	}

	.poster-card:hover {
		border-color: var(--muted);
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
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		background: var(--surface-2);
		flex-shrink: 0;
	}

	.img-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
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
		font-size: 14px;
		font-weight: 500;
		color: var(--fg);
		margin-top: var(--gap-sm);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		margin-top: auto;
		padding-top: 2px;
	}
</style>