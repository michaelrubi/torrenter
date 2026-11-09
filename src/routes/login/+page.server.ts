import { fail, redirect } from '@sveltejs/kit';
import { writeSession } from '$lib/server/pocketbase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/watchlist');
};

// Only same-site paths, so a crafted ?next= cannot bounce users elsewhere.
function safeNext(value: FormDataEntryValue | null): string {
	const next = typeof value === 'string' ? value : '';
	return next.startsWith('/') && !next.startsWith('//') ? next : '/watchlist';
}

export const actions: Actions = {
	default: async (event) => {
		const { locals, request } = event;
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!locals.pb)
			return fail(503, { email, message: 'Accounts are not configured on this server.' });
		if (!email || !password) return fail(400, { email, message: 'Enter your email and password.' });

		try {
			const { token } = await locals.pb.collection('users').authWithPassword(email, password);
			writeSession(event, token);
		} catch {
			return fail(400, { email, message: 'That email and password don’t match.' });
		}

		redirect(303, safeNext(data.get('next')));
	}
};
