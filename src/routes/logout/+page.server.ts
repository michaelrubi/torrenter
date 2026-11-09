import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/pocketbase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: ({ cookies }) => {
		clearSession(cookies);
		redirect(303, '/');
	}
};
