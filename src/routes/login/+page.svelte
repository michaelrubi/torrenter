<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign in · Torrenter</title>
</svelte:head>

<main class="login">
	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<h1>Sign in</h1>
		<p class="hint">Sign in to track shows and get new episodes downloaded automatically.</p>

		<input type="hidden" name="next" value={page.url.searchParams.get('next') ?? ''} />

		<label>
			<span>Email</span>
			<input name="email" type="email" autocomplete="username" required value={form?.email ?? ''} />
		</label>
		<label>
			<span>Password</span>
			<input name="password" type="password" autocomplete="current-password" required />
		</label>

		{#if form?.message}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
		<p class="hint small">Accounts are invite-only. Ask the admin for one.</p>
	</form>
</main>

<style>
	.login {
		display: grid;
		place-items: center;
		padding: var(--gap-xl) var(--gap-lg);
	}

	form {
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: var(--gap-md);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--gap-lg);
	}

	h1 {
		font-family: var(--font-display);
		font-size: var(--fs-h2);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--gap-xs);
		font-size: var(--fs-data);
		color: var(--muted);
	}

	input {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		color: var(--fg);
		font: inherit;
		font-size: var(--fs-body);
		padding: 10px 12px;
	}

	input:focus {
		outline: none;
		border-color: var(--accent);
	}

	button {
		background: var(--accent);
		color: var(--bg);
		border: none;
		border-radius: var(--radius-md);
		padding: 12px;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.hint {
		color: var(--muted);
	}

	.small {
		font-size: var(--fs-chip);
	}

	.error {
		color: var(--peer);
		font-size: var(--fs-data);
	}
</style>
