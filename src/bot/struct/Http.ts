import { ClanWar, ClanWarLeagueGroup, Client, Player } from 'clashofclans.js';
import fetch from 'node-fetch';
import { Agent } from 'https';

const agent = new Agent({ keepAlive: true });

export default class Http extends Client {
	private bearerToken!: string;

	public constructor() {
		super({ baseURL: process.env.BASE_URL });

		this.timeout = 10000;
		this.keys = [...(process.env.CLASH_TOKENS?.split(',') ?? [])];
	}

	public async fetch(path: string) {
		const res = await fetch(`${this.baseURL!}${path}`, {
			headers: {
				Authorization: `Bearer ${this._token}`,
				Accept: 'application/json'
			},
			agent,
			timeout: Number(this.timeout)
		}).catch(() => null);

		const parsed = await res?.json().catch(() => null);
		if (!parsed) return { ok: false, statusCode: res?.status ?? 504 };

		const maxAge = res?.headers.get('cache-control')?.split('=')?.[1] ?? 0;
		return Object.assign(parsed, { statusCode: res?.status ?? 504, ok: res?.status === 200, maxAge: Number(maxAge) * 1000 });
	}

	public fixTag(tag: string) {
		return super.parseTag(tag);
	}

	public detailedClanMembers(members: { tag: string }[] = []): Promise<Player[]> {
		return Promise.all(members.map((mem) => this.fetch(`/players/${encodeURIComponent(mem.tag)}`)));
	}

	public async getCurrentWars(clanTag: string): Promise<(ClanWar & { warTag?: string; round?: number })[]> {
		const date = new Date().getUTCDate();
		if (!(date >= 1 && date <= 10)) {
			const data = await this.currentClanWar(clanTag);
			return data.ok ? [data] : [];
		}

		return this.getClanWarLeague(clanTag);
	}

	private async getClanWarLeague(clanTag: string) {
		const res = await this.clanWarLeague(clanTag);
		if (res.statusCode === 504 || res.state === 'notInWar') return [];
		if (!res.ok) {
			const data = await this.currentClanWar(clanTag);
			return data.ok ? [data] : [];
		}
		return this.clanWarLeagueRounds(clanTag, res);
	}

	private async clanWarLeagueRounds(clanTag: string, body: ClanWarLeagueGroup) {
		const chunks = [];
		for (const { warTags } of body.rounds.filter((en) => !en.warTags.includes('#0')).slice(-2)) {
			for (const warTag of warTags) {
				const data = await this.clanWarLeagueWar(warTag);
				if (!data.ok) continue;
				const round = body.rounds.findIndex((en) => en.warTags.includes(warTag));
				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					chunks.push(Object.assign(data, { warTag, round: round + 1 }, { clan, opponent }));
					break;
				}
			}
		}

		return chunks;
	}

	public async login() {
		await this._login();
		setInterval(this._login.bind(this), 60 * 60 * 1000).unref();
	}

	private async _login() {
		const res = await fetch('https://cocdiscord.link/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: process.env.DISCORD_LINK_USERNAME,
				password: process.env.DISCORD_LINK_PASSWORD
			}),
			agent,
			timeout: 10000
		}).catch(() => null);
		const data = await res?.json().catch(() => null);

		if (data?.token) this.bearerToken = data.token;
		return res?.status === 200 && this.bearerToken;
	}

	public async linkPlayerTag(discordId: string, playerTag: string) {
		const res = await fetch('https://cocdiscord.link/links', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			agent,
			body: JSON.stringify({ playerTag, discordId }),
			timeout: 10000
		}).catch(() => null);

		return Promise.resolve(res?.status === 200);
	}

	public async unlinkPlayerTag(playerTag: string) {
		const res = await fetch(`https://cocdiscord.link/links/${encodeURIComponent(playerTag)}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			agent,
			timeout: 10000
		}).catch(() => null);

		return Promise.resolve(res?.status === 200);
	}

	public async getPlayerTags(user: string) {
		const res = await fetch(`https://cocdiscord.link/links/${user}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			agent,
			timeout: 10000
		}).catch(() => null);
		const data: { playerTag: string; discordId: string }[] = await res?.json().catch(() => []);

		if (!Array.isArray(data)) return [];
		return data.filter((en) => /^#?[0289CGJLOPQRUVY]+$/i.test(en.playerTag)).map((en) => this.fixTag(en.playerTag));
	}

	public async getDiscordLinks(members: { tag: string }[]) {
		const res = await fetch('https://cocdiscord.link/batch', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			timeout: 30000,
			agent,
			body: JSON.stringify(members.map((mem) => mem.tag))
		}).catch(() => null);
		const data: { playerTag: string; discordId: string }[] = await res?.json().catch(() => []);

		if (!Array.isArray(data)) return [];
		return data
			.filter((en) => /^#?[0289CGJLOPQRUVY]+$/i.test(en.playerTag) && /^\d{17,19}/.test(en.discordId))
			.map((en) => ({ tag: this.fixTag(en.playerTag), user: en.discordId }));
	}
}
