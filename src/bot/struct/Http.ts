import { ClanWar, ClanWarLeagueGroup, Client as ClashOfClansClient, Player, WarClan } from 'clashofclans.js';
import fetch from 'node-fetch';
import moment from 'moment';
import TimeoutSignal from 'timeout-signal';

export interface RaidSeason {
	state: string;
	startTime: string;
	endTime: string;
	capitalTotalLoot: number;
	raidsCompleted: number;
	totalAttacks: number;
	enemyDistrictsDestroyed: number;
	offensiveReward: number;
	defensiveReward: number;
	members?: {
		tag: string;
		name: string;
		attacks: number;
		attackLimit: number;
		bonusAttackLimit: number;
		capitalResourcesLooted: number;
	}[];
	attackLog: {
		defender: {
			tag: string;
			name: string;
			level: number;
			badgeUrls: {
				small: string;
				large: string;
				medium: string;
			};
		};
		attackCount: number;
		districtCount: number;
		districtsDestroyed: number;
		districts: {
			id: number;
			name: string;
			districtHallLevel: number;
			destructionPercent: number;
			stars: number;
			attackCount: number;
			totalLooted: number;
			attacks?: {
				attacker: {
					tag: string;
					name: string;
				};
				destructionPercent: number;
				stars: number;
			}[];
		}[];
	}[];
	defenseLog: {
		defender: {
			tag: string;
			name: string;
			level: number;
			badgeUrls: {
				small: string;
				large: string;
				medium: string;
			};
		};
		attackCount: number;
		districtCount: number;
		districtsDestroyed: number;
		districts: {
			id: number;
			name: string;
			districtHallLevel: number;
			destructionPercent: number;
			stars: number;
			attackCount: number;
			totalLooted: number;
			attacks: {
				attacker: {
					tag: string;
					name: string;
				};
				destructionPercent: number;
				stars: number;
			}[];
		}[];
	}[];
}

export default class Http extends ClashOfClansClient {
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
			signal: TimeoutSignal(this.timeout!)
		}).catch(() => null);

		const parsed: any = await res?.json().catch(() => null);
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

	public calcRaidMedals(raidSeason: RaidSeason) {
		const districtMap: Record<string, number> = {
			1: 135,
			2: 225,
			3: 350,
			4: 405,
			5: 460
		};
		const capitalMap: Record<string, number> = {
			2: 180,
			3: 360,
			4: 585,
			5: 810,
			6: 1115,
			7: 1240,
			8: 1260,
			9: 1375,
			10: 1450
		};

		let totalMedals = 0;
		let attacksDone = 0;
		for (const clan of raidSeason.attackLog) {
			attacksDone += clan.attackCount;
			for (const district of clan.districts) {
				if (district.destructionPercent === 100) {
					if (district.id === 70000000) {
						totalMedals += capitalMap[district.districtHallLevel];
					} else {
						totalMedals += districtMap[district.districtHallLevel];
					}
				}
			}
		}

		if (totalMedals !== 0) {
			totalMedals = Math.ceil(totalMedals / attacksDone) * 6;
		}
		return Math.max(totalMedals, raidSeason.offensiveReward * 6 + raidSeason.defensiveReward);
	}

	public calcRaidCompleted(attackLog: RaidSeason['attackLog']) {
		let total = 0;
		for (const clan of attackLog) {
			if (clan.districtsDestroyed === clan.districtCount) total += 1;
		}
		return total;
	}

	private isFriendly(data: ClanWar) {
		const friendlyWarTimes = [
			1000 * 60 * 60 * 24,
			1000 * 60 * 60 * 20,
			1000 * 60 * 60 * 16,
			1000 * 60 * 60 * 12,
			1000 * 60 * 60 * 8,
			1000 * 60 * 60 * 6,
			1000 * 60 * 60 * 4,
			1000 * 60 * 60 * 2,
			1000 * 60 * 60,
			1000 * 60 * 30,
			1000 * 60 * 15,
			1000 * 60 * 5
		];
		return friendlyWarTimes.includes(this.toDate(data.startTime).getTime() - this.toDate(data.preparationStartTime).getTime());
	}

	private toDate(ISO: string) {
		return new Date(moment(ISO).toDate());
	}

	public isWinner(clan: WarClan, opponent: WarClan) {
		if (clan.stars > opponent.stars) {
			return true;
		} else if (clan.stars < opponent.stars) {
			return false;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return true;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return false;
		}
		return false;
	}

	public async getCurrentRaidSeason(tag: string) {
		const res = await this.getRaidSeason({ tag });
		if (!res.ok || !res.items.length) return null;
		if (!res.items[0].members) return null;
		return res.items[0] as Required<RaidSeason>;
	}

	public async getRaidSeason(clan: { tag: string }): Promise<{ items: RaidSeason[]; ok: boolean; statusCode: number }> {
		return this.fetch(`/clans/${encodeURIComponent(clan.tag)}/capitalraidseasons?limit=1`);
	}

	public async getRaidLastSeason(clan: { tag: string }): Promise<{ items: RaidSeason[]; ok: boolean; statusCode: number }> {
		return this.fetch(`/clans/${encodeURIComponent(clan.tag)}/capitalraidseasons?limit=6`);
	}

	public async getCurrentWars(clanTag: string): Promise<(ClanWar & { warTag?: string; round?: number; isFriendly?: boolean })[]> {
		const date = new Date().getUTCDate();
		if (!(date >= 1 && date <= 10)) {
			return this.getCurrentWar(clanTag);
		}

		return this.getClanWarLeague(clanTag);
	}

	private async getCurrentWar(clanTag: string) {
		const data = await this.currentClanWar(clanTag);
		return data.ok ? [Object.assign(data, { isFriendly: this.isFriendly(data) })] : [];
	}

	private async getClanWarLeague(clanTag: string) {
		const res = await this.clanWarLeague(clanTag);
		if (res.statusCode === 504 || res.state === 'notInWar') return [];
		if (!res.ok) {
			return this.getCurrentWar(clanTag);
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
			signal: TimeoutSignal(10_000)
		}).catch(() => null);
		const data: any = await res?.json().catch(() => null);

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
			body: JSON.stringify({ playerTag, discordId }),
			signal: TimeoutSignal(10_000)
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
			signal: TimeoutSignal(10_000)
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
			signal: TimeoutSignal(10_000)
		}).catch(() => null);
		const data = (await res?.json().catch(() => [])) as { playerTag: string; discordId: string }[];

		if (!Array.isArray(data)) return [];
		return data.filter((en) => /^#?[0289CGJLOPQRUVY]+$/i.test(en.playerTag)).map((en) => this.fixTag(en.playerTag));
	}

	public async getLinkedUser(tag: string) {
		const res = await fetch(`https://cocdiscord.link/links/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			signal: TimeoutSignal(10_000)
		}).catch(() => null);
		const data = (await res?.json().catch(() => [])) as { playerTag: string; discordId: string }[];

		if (!Array.isArray(data)) return null;
		return data.map((en) => ({ userId: en.discordId, user: en.discordId }))[0] ?? null;
	}

	public async getDiscordLinks(players: { tag: string }[]) {
		const res = await fetch('https://cocdiscord.link/batch', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			signal: TimeoutSignal(10_000),
			body: JSON.stringify(players.map((mem) => mem.tag))
		}).catch(() => null);
		const data = (await res?.json().catch(() => [])) as { playerTag: string; discordId: string }[];

		if (!Array.isArray(data)) return [];
		return data
			.filter((en) => /^#?[0289CGJLOPQRUVY]+$/i.test(en.playerTag) && /^\d{17,19}/.test(en.discordId))
			.map((en) => ({ tag: this.fixTag(en.playerTag), user: en.discordId, userId: en.discordId }));
	}
}
