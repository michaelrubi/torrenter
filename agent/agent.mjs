// Torrenter download agent: runs beside Transmission, takes queued jobs from PocketBase,
// adds them to Transmission, and reports progress back. Needs Node 20+, no dependencies.

const env = (name, fallback) => {
	const value = process.env[name] ?? fallback;
	if (value === undefined) {
		console.error(`Missing required environment variable ${name}`);
		process.exit(1);
	}
	return value;
};

const PB_URL = env('PB_URL').replace(/\/$/, '');
const PB_EMAIL = env('PB_AGENT_EMAIL');
const PB_PASSWORD = env('PB_AGENT_PASSWORD');
const RPC_URL = env('TRANSMISSION_URL', 'http://localhost:9091/transmission/rpc');
const RPC_USER = process.env.TRANSMISSION_USER ?? '';
const RPC_PASS = process.env.TRANSMISSION_PASSWORD ?? '';
const DOWNLOAD_DIR = process.env.TRANSMISSION_DOWNLOAD_DIR ?? '';
const POLL_MS = Number(process.env.POLL_SECONDS ?? 60) * 1000;

const log = (...args) => console.log(new Date().toISOString(), ...args);

// ---- PocketBase --------------------------------------------------------------

let pbToken = '';
let pbTokenAt = 0;

async function pb(path, init = {}, retry = true) {
	if (!pbToken || Date.now() - pbTokenAt > 60 * 60 * 1000) await pbLogin();
	const res = await fetch(`${PB_URL}${path}`, {
		...init,
		headers: {
			'User-Agent': 'torrenter-agent',
			Authorization: pbToken,
			...(init.body ? { 'Content-Type': 'application/json' } : {}),
			...init.headers
		}
	});
	if (res.status === 401 && retry) {
		pbToken = '';
		return pb(path, init, false);
	}
	if (!res.ok)
		throw new Error(
			`PocketBase ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`
		);
	return res.status === 204 ? null : res.json();
}

async function pbLogin() {
	const res = await fetch(`${PB_URL}/api/collections/agents/auth-with-password`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'User-Agent': 'torrenter-agent' },
		body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD })
	});
	if (!res.ok) throw new Error(`PocketBase sign-in failed: ${res.status} ${await res.text()}`);
	pbToken = (await res.json()).token;
	pbTokenAt = Date.now();
}

const listJobs = (status) =>
	pb(
		`/api/collections/downloads/records?perPage=50&sort=created&filter=${encodeURIComponent(`status="${status}"`)}`
	).then((r) => r.items);

const updateJob = (id, body) =>
	pb(`/api/collections/downloads/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

async function fetchTorrentFile(job) {
	const { token } = await pb('/api/files/token', { method: 'POST' });
	const res = await fetch(
		`${PB_URL}/api/files/downloads/${job.id}/${encodeURIComponent(job.torrent)}?token=${token}`,
		{ headers: { 'User-Agent': 'torrenter-agent' } }
	);
	if (!res.ok) throw new Error(`Torrent file download failed: ${res.status}`);
	return Buffer.from(await res.arrayBuffer()).toString('base64');
}

// ---- Transmission ------------------------------------------------------------

let sessionId = '';

async function rpc(method, args) {
	const headers = { 'Content-Type': 'application/json', 'X-Transmission-Session-Id': sessionId };
	if (RPC_USER)
		headers.Authorization = `Basic ${Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64')}`;

	let res = await fetch(RPC_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({ method, arguments: args })
	});
	// Transmission answers 409 with the session id it wants, once per session.
	if (res.status === 409) {
		sessionId = res.headers.get('X-Transmission-Session-Id') ?? '';
		headers['X-Transmission-Session-Id'] = sessionId;
		res = await fetch(RPC_URL, {
			method: 'POST',
			headers,
			body: JSON.stringify({ method, arguments: args })
		});
	}
	if (!res.ok) throw new Error(`Transmission ${method}: HTTP ${res.status}`);
	const data = await res.json();
	if (data.result !== 'success') throw new Error(`Transmission ${method}: ${data.result}`);
	return data.arguments;
}

// ---- Work --------------------------------------------------------------------

async function sendQueued() {
	for (const job of await listJobs('queued')) {
		try {
			const args = job.magnet
				? { filename: job.magnet }
				: { metainfo: await fetchTorrentFile(job) };
			if (DOWNLOAD_DIR) args['download-dir'] = DOWNLOAD_DIR;
			const result = await rpc('torrent-add', args);
			const added = result['torrent-added'] ?? result['torrent-duplicate'];
			await updateJob(job.id, { status: 'sent', error: '', transmission_id: added.id });
			log(`Sent ${job.title} (${job.release_title}) as Transmission #${added.id}`);
		} catch (err) {
			log(`Failed ${job.title}:`, err.message);
			await updateJob(job.id, { status: 'failed', error: String(err.message).slice(0, 500) }).catch(
				() => {}
			);
		}
	}
}

async function checkSent() {
	const jobs = await listJobs('sent');
	if (jobs.length === 0) return;

	const ids = jobs.map((j) => j.transmission_id).filter(Boolean);
	const { torrents } = await rpc('torrent-get', {
		ids,
		fields: ['id', 'percentDone', 'error', 'errorString']
	});
	const byId = new Map(torrents.map((t) => [t.id, t]));

	for (const job of jobs) {
		const t = byId.get(job.transmission_id);
		if (!t) {
			await updateJob(job.id, {
				status: 'failed',
				error: 'Removed from Transmission before finishing'
			});
		} else if (t.error) {
			await updateJob(job.id, {
				status: 'failed',
				error: t.errorString || `Transmission error ${t.error}`
			});
		} else if (t.percentDone >= 1) {
			await updateJob(job.id, { status: 'done', error: '' });
			log(`Finished ${job.title}`);
		}
	}
}

let running = false;

async function tick() {
	if (running) return;
	running = true;
	try {
		await sendQueued();
		await checkSent();
	} catch (err) {
		log('Cycle failed:', err.message);
	} finally {
		running = false;
	}
}

log(`Torrenter agent started: ${PB_URL} → ${RPC_URL}, every ${POLL_MS / 1000}s`);
await tick();
setInterval(tick, POLL_MS);
