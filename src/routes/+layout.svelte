<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<header class="main-header">
	<div class="header-content">
		<a href={resolve('/')} class="logo-link">
			<img src={favicon} alt="Torrenter" class="logo-icon" />
			<span class="logo-text">Torrenter</span>
		</a>
		<nav class="user-nav">
			{#if data.user}
				<a href={resolve('/watchlist')}>Watchlist</a>
				<form method="POST" action="/logout">
					<button type="submit" title={data.user.email}>Sign out</button>
				</form>
			{:else}
				<a href={resolve('/login')}>Sign in</a>
			{/if}
		</nav>
	</div>
</header>

{@render children()}

<style>
	.main-header {
		width: 100%;
		border-bottom: 1px solid var(--border);
		background: var(--bg);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 var(--gap-lg);
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.user-nav {
		display: flex;
		align-items: center;
		gap: var(--gap-md);
		font-size: var(--fs-data);
	}

	.user-nav a,
	.user-nav button {
		color: var(--muted);
		text-decoration: none;
		background: none;
		border: none;
		font: inherit;
		cursor: pointer;
	}

	.user-nav a:hover,
	.user-nav button:hover {
		color: var(--fg);
	}

	.logo-link {
		display: flex;
		align-items: center;
		gap: var(--gap-sm);
		text-decoration: none;
		color: var(--fg);
		transition: opacity 0.15s;
	}

	.logo-link:hover {
		opacity: 0.8;
	}

	.logo-icon {
		width: 28px;
		height: 28px;
	}

	.logo-text {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 18px;
		letter-spacing: -0.02em;
	}
</style>
