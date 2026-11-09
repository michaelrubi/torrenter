<script lang="ts">
	import {
		getWatchlist,
		retryDownload,
		untrackShow,
		updateShowSettings
	} from '$lib/watchlist.remote';
	import type { DownloadJob, ShowQuality, TrackedShow } from '$lib/types';

	const watchlist = getWatchlist();

	const pad = (n: number | null) => String(n ?? 0).padStart(2, '0');
	const epCode = (s: number | null, e: number | null) => `S${pad(s)}E${pad(e)}`;
	const day = (d: string) => (d ? new Date(d.replace(' ', 'T')) : null);

	function formatAirDate(value: string): string {
		const date = day(value);
		if (!date) return '';
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const local = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
		const days = Math.round((local.getTime() - today.getTime()) / 86_400_000);
		const label = local.toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
		if (days === 0) return `Today · ${label}`;
		if (days === 1) return `Tomorrow · ${label}`;
		if (days > 1 && days < 7) return `In ${days} days · ${label}`;
		return label;
	}

	// Upcoming shows first, soonest at the top; ended or unscheduled ones after.
	function sortShows(shows: TrackedShow[]): TrackedShow[] {
		const key = (s: TrackedShow) => day(s.next_air_date)?.getTime() ?? Infinity;
		return [...shows].sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name));
	}

	const STATUS_LABEL: Record<DownloadJob['status'], string> = {
		queued: 'Queued',
		sent: 'Downloading',
		done: 'Done',
		failed: 'Failed'
	};

	let busy = $state<Record<string, boolean>>({});

	async function run(id: string, action: () => Promise<unknown>) {
		busy[id] = true;
		try {
			await action();
		} finally {
			busy[id] = false;
		}
	}
</script>

<svelte:head>
	<title>Watchlist · Torrenter</title>
</svelte:head>

<main class="watchlist">
	<h1>Watchlist</h1>

	{#if watchlist.error}
		<p class="empty">Couldn’t load your watchlist. Try reloading the page.</p>
	{:else if !watchlist.current}
		<p class="empty">Loading…</p>
	{:else if watchlist.current.shows.length === 0}
		<p class="empty">
			You aren’t tracking any shows yet. Open a TV show from the home page and choose
			<strong>Track show</strong>.
		</p>
	{:else}
		<ul class="shows">
			{#each sortShows(watchlist.current.shows) as show (show.id)}
				<li class="show">
					{#if show.poster_path}
						<img src={`https://image.tmdb.org/t/p/w154${show.poster_path}`} alt="" loading="lazy" />
					{:else}
						<div class="poster-placeholder"></div>
					{/if}

					<div class="info">
						<h2>{show.name}</h2>
						{#if show.next_air_date}
							<p class="next">
								<span class="code">{epCode(show.next_season, show.next_episode)}</span>
								{formatAirDate(show.next_air_date)}
								{#if show.next_episode_name}<span class="ep-name">· {show.next_episode_name}</span
									>{/if}
							</p>
						{:else}
							<p class="next muted">{show.status || 'No upcoming episodes'}</p>
						{/if}
						{#if show.last_air_date}
							<p class="muted small">
								Latest: {epCode(show.last_season, show.last_episode)} · {formatAirDate(
									show.last_air_date
								)}
							</p>
						{/if}
						{#if show.auto_download && show.last_grabbed_season}
							<p class="muted small">
								Grabbed up to {epCode(show.last_grabbed_season, show.last_grabbed_episode)}
							</p>
						{/if}
					</div>

					<div class="controls">
						<label class="toggle">
							<input
								type="checkbox"
								checked={show.auto_download}
								disabled={busy[show.id]}
								onchange={(e) =>
									run(show.id, () =>
										updateShowSettings({ id: show.id, auto_download: e.currentTarget.checked })
									)}
							/>
							Auto-download
						</label>
						<select
							aria-label="Quality"
							value={show.quality || '1080p'}
							disabled={busy[show.id]}
							onchange={(e) =>
								run(show.id, () =>
									updateShowSettings({ id: show.id, quality: e.currentTarget.value as ShowQuality })
								)}
						>
							<option value="720p">720p</option>
							<option value="1080p">1080p</option>
							<option value="2160p">4K</option>
							<option value="any">Any</option>
						</select>
						<button
							class="link-btn"
							disabled={busy[show.id]}
							onclick={() => run(show.id, () => untrackShow(show.id))}>Remove</button
						>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if watchlist.current && watchlist.current.downloads.length > 0}
		<h2 class="section">Recent downloads</h2>
		<ul class="downloads">
			{#each watchlist.current.downloads as job (job.id)}
				<li>
					<span class="job-title">{job.title}</span>
					<span class="release" title={job.release_title}>{job.release_title}</span>
					<span class="status {job.status}" title={job.error || undefined}>
						{STATUS_LABEL[job.status]}
					</span>
					{#if job.status === 'failed'}
						<button
							class="link-btn"
							disabled={busy[job.id]}
							onclick={() => run(job.id, () => retryDownload(job.id))}>Retry</button
						>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.watchlist {
		max-width: 960px;
		margin: 0 auto;
		padding: var(--gap-lg);
		display: flex;
		flex-direction: column;
		gap: var(--gap-md);
	}

	h1 {
		font-family: var(--font-display);
		font-size: var(--fs-h2);
	}

	.section {
		font-family: var(--font-display);
		font-size: 18px;
		margin-top: var(--gap-lg);
	}

	.empty,
	.muted {
		color: var(--muted);
	}

	.small {
		font-size: var(--fs-chip);
	}

	ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--gap-sm);
	}

	.show {
		display: grid;
		grid-template-columns: 56px 1fr auto;
		gap: var(--gap-md);
		align-items: center;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--gap-sm) var(--gap-md) var(--gap-sm) var(--gap-sm);
	}

	.show img,
	.poster-placeholder {
		width: 56px;
		height: 84px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.info h2 {
		font-size: 16px;
		font-weight: 600;
	}

	.code {
		font-family: var(--font-mono);
		font-size: var(--fs-data);
		color: var(--accent);
		margin-right: var(--gap-xs);
	}

	.ep-name {
		color: var(--muted);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--gap-md);
		font-size: var(--fs-data);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: var(--gap-xs);
		cursor: pointer;
	}

	.toggle input {
		accent-color: var(--accent);
	}

	select {
		background: var(--bg);
		color: var(--fg);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 4px 6px;
		font: inherit;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}

	.link-btn:hover {
		color: var(--fg);
	}

	.downloads li {
		display: grid;
		grid-template-columns: 180px 1fr auto auto;
		gap: var(--gap-md);
		align-items: center;
		padding: var(--gap-sm) var(--gap-md);
		border-bottom: 1px solid var(--border);
		font-size: var(--fs-data);
	}

	.release {
		color: var(--muted);
		font-family: var(--font-mono);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status {
		font-weight: 600;
	}

	.status.queued {
		color: var(--gold);
	}

	.status.sent {
		color: var(--accent);
	}

	.status.done {
		color: var(--seed);
	}

	.status.failed {
		color: var(--peer);
	}

	@media (max-width: 640px) {
		.show {
			grid-template-columns: 56px 1fr;
		}

		.controls {
			grid-column: 1 / -1;
			flex-wrap: wrap;
		}

		.downloads li {
			grid-template-columns: 1fr auto;
		}

		.release {
			display: none;
		}
	}
</style>
