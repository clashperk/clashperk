import { ClanWar, ClanWarLeague, Client, Player } from 'clashofclans.js';
import fetch from 'node-fetch';

export default class Http extends Client {
	private tokenIndex: number;
	private bearerToken!: string;

	public constructor() {
		super({ baseURL: process.env.BASE_URL });

		this.timeout = 5000;
		this.token = [...process.env.CLASH_TOKENS!.split(',')];
		this.tokenIndex = 0;
	}

	public async fetch(path: string) {
		const res = await fetch(`${this.baseURL!}${path}`, {
			headers: {
				Authorization: `Bearer ${this.randomToken}`,
				Accept: 'application/json'
			},
			timeout: Number(this.timeout)
		}).catch(() => null);

		const parsed = await res?.json().catch(() => null);
		if (!parsed) return { ok: false, statusCode: res?.status ?? 504 };

		const maxAge = res?.headers.get('cache-control')?.split('=')?.[1] ?? 0;
		return Object.assign(parsed, { statusCode: res?.status ?? 504, ok: res?.status === 200, maxAge: Number(maxAge) * 1000 });
	}

	public detailedClanMembers(members: { tag: string }[] = []): Promise<Player[]> {
		return Promise.all(members.map(mem => this.fetch(`/players/${encodeURIComponent(mem.tag)}`)));
	}

	public async clanWarLeagueRounds(clanTag: string, body: ClanWarLeague, fetchAllRounds = false, start?: number, end?: number) {
		const chunks = [];
		for (const { warTags } of body.rounds.filter(en => !en.warTags.includes('#0')).slice(start, end)) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.clanWarLeagueWar(warTag);
				if (!data.ok) continue;
				const round = body.rounds.findIndex(en => en.warTags.includes(warTag));
				if (!fetchAllRounds && (data.clan.tag === clanTag || data.opponent.tag === clanTag)) {
					chunks.push(Object.assign(data, { warTag, round: round + 1 }));
					break;
				}
				if (fetchAllRounds) {
					chunks.push(Object.assign(data, { warTag, round: round + 1 }));
				}
			}
		}

		return chunks;
	}

	public getCurrentWar(clanTag: string /* round?: number */): Promise<ClanWar & { warTag?: string; round?: number }> {
		// if (this.leagueWar) return this.getClanWarLeague(clanTag, round);
		return this.currentClanWar(clanTag);
	}

	public async getClanWarLeague(clanTag: string, round?: number) {
		const res: ClanWarLeague = await this.clanWarLeague(clanTag);
		if (res.statusCode === 504) null;
		if (!res.ok) return null; // this.currentClanWar(clanTag);

		const num = this.getRoundIndex(res, round);
		const wars = await this.clanWarLeagueRounds(clanTag, res, false, ...num);
		if (!wars.length) null;
		return wars.find(en => en.state === 'preparation') ?? wars.pop()!;
	}

	public getRoundIndex(res: ClanWarLeague, round?: number) {
		const rounds = res.rounds.filter(en => !en.warTags.includes('#0'));
		return round && round <= rounds.length
			? [round - 1, round]
			: rounds.length === 7 ? [-2] : [-1];
	}

	private get leagueWar() {
		return new Date().getDate() >= 1 && new Date().getDate() <= 10;
	}

	private get randomToken() {
		const token = this.tokens[this.tokenIndex];
		this.tokenIndex = (this.tokenIndex + 1) >= this.tokens.length ? 0 : (this.tokenIndex + 1);
		return token;
	}

	public async init() {
		await this.login();
		setInterval(this.login.bind(this), 1 * 60 * 60 * 1000);
	}

	private async login() {
		const res = await fetch('https://cocdiscordlink.azurewebsites.net/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: process.env.DISCORD_LINK_USERNAME,
				password: process.env.DISCORD_LINK_PASSWORD
			}),
			timeout: 8000
		}).catch(() => null);
		const data = await res?.json().catch(() => null);

		if (data?.token) this.bearerToken = data.token as string;
		return Promise.resolve(res?.status === 200 && this.bearerToken);
	}

	public async linkPlayerTag(discordId: string, playerTag: string) {
		const res = await fetch('https://cocdiscordlink.azurewebsites.net/api/links', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ playerTag, discordId }),
			timeout: 5000
		}).catch(() => null);

		return Promise.resolve(res?.status === 200);
	}

	public async unlinkPlayerTag(playerTag: string) {
		const res = await fetch(`https://cocdiscordlink.azurewebsites.net/api/links/${encodeURIComponent(playerTag)}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			timeout: 5000
		}).catch(() => null);

		return Promise.resolve(res?.status === 200);
	}

	public async getPlayerTags(user: string) {
		const res = await fetch(`https://cocdiscordlink.azurewebsites.net/api/links/${user}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			timeout: 3000
		}).catch(() => null);

		const data: { playerTag: string; discordId: string }[] = await res?.json().catch(() => []);
		return data.filter(d => /^#?[0289CGJLOPQRUVY]+$/i.test(d.playerTag))
			.map(d => `#${d.playerTag.toUpperCase().replace(/^#/g, '').replace(/o|O/g, '0')}`);
	}
}
