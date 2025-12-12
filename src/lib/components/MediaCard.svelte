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
<div class="media-card" onclick={onClick}>
	<div class="poster-wrapper">
		{#if posterUrl}
			<img src={posterUrl} alt={title} class="poster-image" loading="lazy" />
		{:else}
			<div class="poster-placeholder">
				<span>No Image</span>
			</div>
		{/if}
		<div class="overlay">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="search-icon"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
		</div>
	</div>
	<div class="info">
		<h3 class="title" {title}>{title}</h3>
		<span class="year">{year}</span>
	</div>
</div>

<style>
	.media-card {
		position: relative;
		width: 100%;
		cursor: pointer;
		transition: transform 0.2s ease;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.media-card:hover {
		transform: translateY(-4px);
	}

	.poster-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 2/3;
		border-radius: 12px;
		overflow: hidden;
		background-color: var(--surface-color);
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.poster-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}

	.media-card:hover .poster-image {
		transform: scale(1.05);
	}

	.poster-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--surface-color);
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.overlay {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.media-card:hover .overlay {
		opacity: 1;
	}

	.search-icon {
		color: white;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	.info {
		padding: 0 0.25rem;
	}

	.title {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.year {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}
</style>
