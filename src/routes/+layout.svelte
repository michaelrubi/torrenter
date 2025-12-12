<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
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
		border-bottom: 1px solid var(--border-color);
		background-color: rgba(23, 23, 23, 0.8);
		backdrop-filter: blur(8px);
		position: sticky;
		top: 0;
		z-index: 50;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
	}

	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--text-primary);
		transition: opacity 0.2s;
	}

	.logo-link:hover {
		opacity: 0.8;
	}

	.logo-icon {
		width: 32px;
		height: 32px;
	}

	.logo-text {
		font-weight: 700;
		font-size: 1.25rem;
		letter-spacing: -0.025em;
	}
</style>
