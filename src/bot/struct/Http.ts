// import { Result } from '@sapphire/result';
import {
  APICapitalRaidSeason,
  APIClanWar,
  APIClanWarLeagueGroup,
  APIWarClan,
  RESTManager as ClashOfClansClient,
  RequestHandler
} from 'clashofclans.js';
import moment from 'moment';
import TimeoutSignal from 'timeout-signal';
import { request } from 'undici';
import { ClanWarLeagueGroupsEntity } from '../entities/cwl-groups.entity.js';
import { DISCORD_ID_REGEX, TAG_REGEX } from '../util/Constants.js';
import Client from './Client.js';

export default class Http extends ClashOfClansClient {
  private bearerToken!: string;

  public constructor(private readonly client: Client) {
    const keys = process.env.CLASH_TOKENS?.split(',') ?? [];

    super({
      restRequestTimeout: 10_000,
      baseURL: process.env.BASE_URL,
      keys: [...keys]
    });

    this.requestHandler = new RequestHandler({
      restRequestTimeout: 10_000,
      rejectIfNotValid: false,
      cache: false,
      retryLimit: 0,
      connections: 50,
      pipelining: 10,
      keys: [...keys],
      baseURL: process.env.BASE_URL,
      onError: ({ path, status, body }) => {
        if (
          (status !== 200 || !body) &&
          !(!(body as Record<string, string>)?.message && status === 403) &&
          !(path.includes('war') && status === 404)
        ) {
          this.client.logger.debug(`${status} ${path}`, { label: 'HTTP' });
        }
      }
    });
  }

  public getClanURL(clanTag: string) {
    return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clanTag)}`;
  }

  public getPlayerURL(playerTag: string) {
    return `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(playerTag)}`;
  }

  public fixTag(tag: string) {
    return super.util.parseTag(tag);
  }

  public isValidTag(tag?: string) {
    if (!tag) return false;
    return /^#?[0289PYLQGRJCUV]{3,}$/.test(tag.toUpperCase().replace(/O/g, '0'));
  }

  public async _getPlayers(players: { tag: string }[] = []) {
    const result = await Promise.all(players.map((mem) => this.getPlayer(mem.tag)));
    return result.filter(({ res }) => res.ok).map(({ body }) => body);
  }

  public async _getClans(clans: { tag: string }[] = []) {
    const result = await Promise.all(clans.map((clan) => this.getClan(clan.tag)));
    return result.filter(({ res }) => res.ok).map(({ body }) => body);
  }

  public calcRaidMedals(raidSeason: APICapitalRaidSeason) {
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
    return Math.max(totalMedals, raidSeason.offensiveReward * 6);
  }

  public calcRaidCompleted(attackLog: APICapitalRaidSeason['attackLog']) {
    let total = 0;
    for (const clan of attackLog) {
      if (clan.districtsDestroyed === clan.districtCount) total += 1;
    }
    return total;
  }

  private isFriendly(data: APIClanWar) {
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

  private toDate(ISO: string | Date) {
    return new Date(moment(ISO).toDate());
  }

  public isWinner(clan: APIWarClan, opponent: APIWarClan) {
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

  public getRaidSeasons(tag: string, limit = 1) {
    // Result.fromAsync(() => super.getCapitalRaidSeasons(tag, { limit }));
    return super.getCapitalRaidSeasons(tag, { limit });
  }

  public async getCurrentWars(clanTag: string): Promise<(APIClanWar & { warTag?: string; round?: number; isFriendly?: boolean })[]> {
    const date = new Date().getUTCDate();
    if (!(date >= 1 && date <= 10)) {
      return this._getCurrentWar(clanTag);
    }

    return this._getClanWarLeague(clanTag);
  }

  private async _getCurrentWar(clanTag: string) {
    const { body: data, res } = await this.getCurrentWar(clanTag);
    return res.ok ? [Object.assign(data, { isFriendly: this.isFriendly(data) })] : [];
  }

  private async _getClanWarLeague(clanTag: string) {
    const { body: data, res } = await this.getClanWarLeagueGroup(clanTag);
    if (res.status === 504 || data.state === 'notInWar') return [];
    if (!res.ok) return this._getCurrentWar(clanTag);
    return this._clanWarLeagueRounds(clanTag, data);
  }

  public async _clanWarLeagueRounds(clanTag: string, body: APIClanWarLeagueGroup) {
    const chunks = [];
    for (const { warTags } of body.rounds.filter((en) => !en.warTags.includes('#0')).slice(-2)) {
      for (const warTag of warTags) {
        const { body: data, res } = await this.getClanWarLeagueRound(warTag);
        if (!res.ok) continue;
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

  public async getCWLRoundWithWarTag(warTag: string) {
    const body = await this._getCWLRoundWithWarTag(warTag);
    if (!body.ok || body.state === 'notInWar') return null;
    return body;
  }

  private async _getCWLRoundWithWarTag(warTag: string) {
    const { body, res } = await this.getClanWarLeagueRound(warTag);
    return { warTag, ...body, ...res };
  }

  public async aggregateClanWarLeague(clanTag: string, group: ClanWarLeagueGroupsEntity, isApiData: boolean) {
    const warTags = group.rounds
      .filter((r) => !r.warTags.includes('#0'))
      .map((round) => round.warTags)
      .flat();

    const seasonFormat = 'YYYY-MM';
    if (moment().format(seasonFormat) !== moment(group.season).format(seasonFormat) && !isApiData) {
      return this.getDataFromArchive(clanTag, group.season, group);
    }

    const rounds: (APIClanWar & { warTag: string; ok: boolean })[] = (
      await Promise.all(warTags.map((warTag) => this._getCWLRoundWithWarTag(warTag)))
    ).filter((res) => res.ok && res.state !== 'notInWar');

    return {
      season: group.season,
      clans: group.clans,
      rounds,
      leagues: group.leagues ?? {}
    } satisfies ClanWarLeagueGroupAggregated;
  }

  public async getDataFromArchive(clanTag: string, season: string, group?: ClanWarLeagueGroupsEntity) {
    const res = await fetch(
      `https://clan-war-league-api-production.up.railway.app/clans/${encodeURIComponent(clanTag)}/cwl/seasons/${season}`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as unknown as ClanWarLeagueGroupExtended;
    data['leagues'] = group?.leagues ?? {};

    return data;
  }

  public async autoLogin() {
    await this._login();
    setInterval(this._login.bind(this), 60 * 60 * 1000).unref();
  }

  private async _login() {
    const res = await request('https://cocdiscord.link/login', {
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
    const data = (await res?.body.json().catch(() => null)) as { token?: string } | null;

    if (data?.token) this.bearerToken = data.token;
    return res?.statusCode === 200 && this.bearerToken;
  }

  public async linkPlayerTag(discordId: string, playerTag: string) {
    const res = await request('https://cocdiscord.link/links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ playerTag, discordId }),
      signal: TimeoutSignal(10_000)
    }).catch(() => null);

    return Promise.resolve(res?.statusCode === 200);
  }

  public async unlinkPlayerTag(playerTag: string) {
    const res = await request(`https://cocdiscord.link/links/${encodeURIComponent(playerTag)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      signal: TimeoutSignal(10_000)
    }).catch(() => null);

    return Promise.resolve(res?.statusCode === 200);
  }

  public async getPlayerTags(user: string) {
    const res = await request(`https://cocdiscord.link/links/${user}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      signal: TimeoutSignal(10_000)
    }).catch(() => null);
    const data = (await res?.body.json().catch(() => [])) as { playerTag: string; discordId: string }[];

    if (!Array.isArray(data)) return [];
    return data.filter((en) => TAG_REGEX.test(en.playerTag)).map((en) => this.fixTag(en.playerTag));
  }

  public async getLinkedUser(tag: string) {
    const res = await request(`https://cocdiscord.link/links/${encodeURIComponent(tag)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      signal: TimeoutSignal(10_000)
    }).catch(() => null);
    const data = (await res?.body.json().catch(() => [])) as { playerTag: string; discordId: string }[];

    if (!Array.isArray(data)) return null;
    return data.map((en) => ({ userId: en.discordId, tag }))[0] ?? null;
  }

  public async getDiscordLinks(players: { tag: string }[]) {
    if (!players.length) return [];

    const res = await request('https://cocdiscord.link/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      signal: TimeoutSignal(10_000),
      body: JSON.stringify(players.map((mem) => mem.tag))
    }).catch(() => null);
    const data = (await res?.body.json().catch(() => [])) as { playerTag: string; discordId: string }[];
    if (!Array.isArray(data)) return [];
    return data
      .filter((en) => TAG_REGEX.test(en.playerTag) && DISCORD_ID_REGEX.test(en.discordId))
      .map((en) => ({
        tag: this.fixTag(en.playerTag),
        userId: en.discordId,
        verified: false,
        displayName: 'Unknown',
        username: 'unknown'
      }));
  }
}

export interface ClanWarLeagueGroupAggregated {
  season: string;
  clans: { name: string; tag: string }[];
  rounds: (APIClanWar & { warTag: string })[];
  leagues: Record<string, number>;
}

export interface ClanWarLeagueGroupExtended extends ClanWarLeagueGroupAggregated {
  leagueId: number;
}
