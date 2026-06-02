<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<header class="main-header">
	<div class="header-content">
		<a href="/" class="logo-link">
			<img src={favicon} alt="Torrenter" class="logo-icon" />
			<span class="logo-text">Torrenter</span>
		</a>
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