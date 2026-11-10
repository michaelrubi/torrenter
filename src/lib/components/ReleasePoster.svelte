<script lang="ts">
	import { getPoster } from '../../routes/data.remote';
	import { parseMediaInfo } from '$lib/utils/title-parser';

	let {
		title,
		onOpen
	}: {
		title: string;
		onOpen?: (media: { id: number; mediaType: 'movie' | 'tv' }) => void;
	} = $props();

	const info = $derived(parseMediaInfo(title));
</script>

{#snippet image(url: string)}
	{#if url}
		<img src={url} alt="" loading="lazy" />
	{/if}
{/snippet}

{#if info}
	{#await getPoster(info)}
		<div class="poster" aria-hidden="true"></div>
	{:then match}
		{#if match && onOpen}
			<button
				type="button"
				class="poster clickable"
				title={`Details for ${info.name}`}
				aria-label={`Show details for ${info.name}`}
				onclick={() => onOpen({ id: match.id, mediaType: match.mediaType })}
			>
				{@render image(match.url)}
			</button>
		{:else}
			<div class="poster" aria-hidden="true">{@render image(match?.url ?? '')}</div>
		{/if}
	{:catch}
		<div class="poster" aria-hidden="true"></div>
	{/await}
{:else}
	<div class="poster" aria-hidden="true"></div>
{/if}

<style>
	.poster {
		flex: none;
		width: 40px;
		aspect-ratio: 2 / 3;
		border-radius: 4px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
		padding: 0;
		border: none;
	}

	.clickable {
		cursor: pointer;
		transition:
			box-shadow 0.15s,
			transform 0.15s;
	}

	.clickable:hover,
	.clickable:focus-visible {
		box-shadow: 0 0 0 2px var(--accent);
		transform: scale(1.05);
		outline: none;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
