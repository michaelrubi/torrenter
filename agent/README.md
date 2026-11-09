# Torrenter download agent

Runs on the download machine next to Transmission. Every minute it:

1. Takes `queued` jobs from the PocketBase `downloads` collection and adds them to Transmission (a magnet, or the `.torrent` file the Torrenter server attached).
2. Marks them `sent`, then `done` once Transmission finishes, or `failed` with the reason.

It signs in as the `downloader` account in the `agents` collection, which can only read and update download jobs. Jackett isn't needed on this machine. The Torrenter server picks releases and queues them.

## Run

With Node 20+:

```bash
cp .env.example .env   # fill in PB_AGENT_PASSWORD and Transmission details
node --env-file=.env agent.mjs
```

With Docker:

```bash
docker build -t torrenter-agent .
docker run -d --restart unless-stopped --network host --env-file .env torrenter-agent
```

`--network host` lets it reach Transmission on `localhost:9091`. Drop it and point `TRANSMISSION_URL` at the right host otherwise.
