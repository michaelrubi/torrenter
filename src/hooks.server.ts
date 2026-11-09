import type { Handle, ServerInit } from '@sveltejs/kit';
import { createUserClient, readSession, writeSession, clearSession } from '$lib/server/pocketbase';
import { startScheduler } from '$lib/server/scheduler';

export const init: ServerInit = () => {
	startScheduler();
};

export const handle: Handle = async ({ event, resolve }) => {
	const pb = createUserClient();
	event.locals.pb = pb;
	event.locals.user = null;

	const token = readSession(event.cookies);
	if (pb && token) {
		pb.authStore.save(token, null);
		try {
			const { record, token: fresh } = await pb.collection('users').authRefresh();
			event.locals.user = { id: record.id, email: record.email, name: record.name ?? '' };
			if (fresh !== token) writeSession(event, fresh);
		} catch {
			pb.authStore.clear();
			clearSession(event.cookies);
		}
	}

	return resolve(event);
};
