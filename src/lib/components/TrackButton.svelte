<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getTrackedShow, trackShow, untrackShow } from '$lib/watchlist.remote';

	let { tmdbId }: { tmdbId: number } = $props();

	const tracked = $derived(getTrackedShow(tmdbId));
	let busy = $state(false);
	let failed = $state(false);

	async function toggle() {
		busy = true;
		failed = false;
		try {
			const show = tracked.current;
			if (show) await untrackShow(show.id);
			else await trackShow(tmdbId);
		} catch (err) {
			console.error('Track toggle failed:', err);
			failed = true;
		} finally {
			busy = false;
		}
	}
</script>

{#if !page.data.user}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() is used; the rule can't see past the appended query string -->
	<a
		class="track-btn"
		href={resolve('/login') + `?next=${encodeURIComponent(page.url.pathname + page.url.search)}`}
	>
		Sign in to track
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		class="track-btn"
		class:on={!!tracked.current}
		disabled={busy || tracked.loading}
		onclick={toggle}
		aria-pressed={!!tracked.current}
	>
		{#if tracked.current}✓ Tracking{:else}+ Track show{/if}
	</button>
	{#if failed}
		<span class="track-error" role="alert">Couldn’t update. Try again.</span>
	{/if}
{/if}

<style>
	.track-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 12px 20px;
		border-radius: var(--radius-md);
		border: 1px solid var(--accent);
		background: transparent;
		color: var(--accent);
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s;
	}

	.track-btn:hover:not(:disabled) {
		background: var(--accent-dim);
	}

	.track-btn.on {
		background: var(--accent-dim);
	}

	.track-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.track-error {
		color: var(--peer);
		font-size: var(--fs-chip);
	}
</style>
