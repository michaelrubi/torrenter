<script lang="ts">
	import { getPoster } from '../../routes/data.remote';
	import { parseMediaInfo } from '$lib/utils/title-parser';

	let { title }: { title: string } = $props();

	const info = $derived(parseMediaInfo(title));
</script>

<div class="poster" aria-hidden="true">
	{#if info}
		{#await getPoster(info) then url}
			{#if url}
				<img src={url} alt="" loading="lazy" />
			{/if}
		{/await}
	{/if}
</div>

<style>
	.poster {
		flex: none;
		width: 40px;
		aspect-ratio: 2 / 3;
		border-radius: 4px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
