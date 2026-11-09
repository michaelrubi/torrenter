import PocketBase from 'pocketbase';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

const AUTH_COOKIE = 'pb_auth';

export function readSession(cookies: Cookies): string | undefined {
	return cookies.get(AUTH_COOKIE);
}

export function writeSession(event: Pick<RequestEvent, 'cookies' | 'url'>, token: string) {
	event.cookies.set(AUTH_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// The homelab serves plain HTTP, so only mark it secure when the request was HTTPS.
		secure: !dev && event.url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 30
	});
}

export function clearSession(cookies: Cookies) {
	cookies.delete(AUTH_COOKIE, { path: '/' });
}

export function pbUrl(): string | undefined {
	return env.PB_URL;
}

export function createUserClient(): PocketBase | null {
	const url = pbUrl();
	if (!url) return null;
	const pb = new PocketBase(url);
	pb.autoCancellation(false);
	return pb;
}

let serverClient: PocketBase | null = null;

// The scheduler acts for every user, so it signs in as the "server" agent account,
// whose rules let it read all shows and queue downloads but nothing else.
export async function getServerClient(): Promise<PocketBase | null> {
	const url = pbUrl();
	const email = env.PB_SERVER_EMAIL;
	const password = env.PB_SERVER_PASSWORD;
	if (!url || !email || !password) return null;

	if (!serverClient) {
		serverClient = new PocketBase(url);
		serverClient.autoCancellation(false);
	}
	if (!serverClient.authStore.isValid) {
		await serverClient.collection('agents').authWithPassword(email, password);
	}
	return serverClient;
}
