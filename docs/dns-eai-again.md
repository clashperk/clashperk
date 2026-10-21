# DNS: `EAI_AGAIN` on the Contabo VM

> Incident notes from 2026-10-21. The bot logged `getaddrinfo EAI_AGAIN api.clashofclans.com` / `discord.com` errors and `This operation was aborted` timeouts.

---

## Symptoms

- `[HTTP] » 500 /players/... {"message":"getaddrinfo EAI_AGAIN api.clashofclans.com"}`
- `Error: getaddrinfo EAI_AGAIN discord.com` from command handlers
- Clash API calls ending in `This operation was aborted`, because a slow lookup used up the request's timeout

## Root cause

Lookups from a container went through three hops:

```
container (musl getaddrinfo, A + AAAA)
  → Docker embedded DNS 127.0.0.11
    → host systemd-resolved 127.0.0.53   ← times out here
      → provider DNS
```

- `dockerd` logged `[resolver] failed to query external DNS server ... 127.0.0.53:53: i/o timeout` (264 times on 2026-10-21). **Every failed query was AAAA**: mostly `discord.com` and `api.clashofclans.com`, plus a few for posthog and mixpanel.
- The bot image is Alpine, and Node's `dns.lookup` uses musl `getaddrinfo`, which asks for A and AAAA together. When the AAAA answer stalls, the whole lookup waits about 5s and then fails with `EAI_AGAIN`.
- The host itself is fine: `dig` against `127.0.0.53`, the provider's DNS and `1.1.1.1` showed no failures. Only the hop from Docker's DNS to systemd-resolved (systemd 249, Ubuntu 22.04) drops queries.

### Measurements (inside `clashperk_bot`, 300 AAAA queries at 10/s, run in parallel)

| Path | Failures |
| --- | --- |
| `127.0.0.11` (Docker → systemd-resolved) | 23 (~8%) |
| Provider DNS directly | 0 |
| `1.1.1.1` directly | 0 |

IPv4-only lookups (`{ family: 4 }` / `resolve4`) never failed. Lookups one at a time were also clean; the failures show up only under steady concurrent load.

## Fix

Docker skips systemd-resolved and forwards lookups straight to upstream servers. In `/etc/docker/daemon.json` on the VM:

```json
{ "dns": ["1.1.1.1", "8.8.8.8"] }
```

followed by `sudo systemctl restart docker`. This restarts every container. Those with `restart: always` / `on-failure` come back on their own.

This applies to every container, including the custom bots started by `docker-service`. The per-service alternative is the commented `dns:` block on `clashperk_bot` in `docker-compose.yml`, which fixes only the main bot.

After the change, the same test showed 0 failures and 0 lookups over 1s, and the bot logged no `EAI_AGAIN`.

`1.1.1.1` goes first: with the provider's DNS first, `dockerd` logged regular `i/o timeout`s against it, each costing that lookup a few seconds before it fell back to the next server.

## Checking it again

```bash
# Docker DNS forwarding errors (which server, which query type)
sudo journalctl -u docker --since today | grep "failed to query external DNS"

# EAI_AGAIN in the bot
docker logs --since 2h clashperk_bot 2>&1 | grep -c EAI_AGAIN

# Upstream servers the container's DNS forwards to
docker exec clashperk_bot cat /etc/resolv.conf   # look at "ExtServers"
```

An occasional `i/o timeout` against one server is harmless: `dockerd` falls back to the next one.
