import { Clan, ClanWar, ClanWarLeagueGroup, WarClan } from 'clashofclans.js';
import { BLUE_NUMBERS, ORANGE_NUMBERS, WHITE_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Message, Util } from 'discord.js';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import moment from 'moment';

export default class CWLRosterCommand extends Command {
	public constructor() {
		super('cwl-roster', {
			aliases: ['roster', 'cwl-roster'],
			category: 'war',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES'],
			description: {
				content: 'CWL Roster and Town-Hall distribution.',
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) return message.util!.send('**504 Request Timeout!**');

		if (!body.ok) {
			return message.util!.send(`**${data.name} is not in Clan War League!**`);
		}

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data.tag);
	}

	private async fetch(warTag: string) {
		const data = await this.client.http.clanWarLeagueWar(warTag);
		return { warTag, ...data };
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clanTag: string) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));

		const clanRounds = [];
		let [stars, destruction] = [0, 0];
		const ranking: { [key: string]: any } = {};

		const warTags = rounds.map(round => round.warTags).flat();
		const wars: (ClanWar & { warTag: string })[] = await Promise.all(warTags.map(warTag => this.fetch(warTag)));

		for (const data of body.clans) {
			ranking[data.tag] = {
				name: data.name,
				tag: data.tag,
				stars: 0,
				destruction: 0
			};
		}

		for (const data of wars) {
			if (!data.ok) continue;

			const clan = ranking[data.clan.tag];
			const opponent = ranking[data.opponent.tag];

			if (data.state === 'inWar') {
				clan.stars += data.clan.stars;
				clan.destruction += data.clan.destructionPercentage * data.teamSize;

				opponent.stars += data.opponent.stars;
				opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
			}

			if (data.state === 'warEnded') {
				clan.stars += this.winner(data.clan, data.opponent)
					? data.clan.stars + 10
					: data.clan.stars;
				clan.destruction += data.clan.destructionPercentage * data.teamSize;

				opponent.stars += this.winner(data.opponent, data.clan)
					? data.opponent.stars + 10
					: data.opponent.stars;
				opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
			}

			if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
				const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
				const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
				if (data.state === 'warEnded') {
					stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
				}
				if (data.state === 'inWar') {
					stars += clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
				}

				clanRounds.push({
					clan, opponent, state: data.state,
					round: body.rounds.findIndex(round => round.warTags.includes(data.warTag))
				});
			}
		}

		const flatTownHalls = body.clans.map(clan => clan.members).flat().map(mem => mem.townHallLevel);
		const [max, min] = [Math.max(...flatTownHalls), Math.min(...flatTownHalls)];
		const townHalls = Array(Math.min(5, (max - min) + 1)).fill(0).map((_, i) => max - i);

		const ranks = Object.values(ranking);
		ranks.sort((a, b) => b.destruction - a.destruction).sort((a, b) => b.stars - a.stars);
		const next = clanRounds.find(round => round.state === 'preparation');
		const rank = ranks.findIndex(a => a.tag === clanTag);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setDescription([
				'**Clan War League Rosters**',
				`${EMOJIS.HASH} ${townHalls.map(th => ORANGE_NUMBERS[th]).join('')} **Clan**`,
				ranks.sort((a, b) => b.stars - a.stars)
					.map(
						(clan, i) => `${BLUE_NUMBERS[++i]} ${this.flat(clan.tag, townHalls, body)} \u200e${clan.name as string}`
					)
					.join('\n')
			]);

		if (next) {
			const opprank = ranks.findIndex(clan => clan.tag === next.opponent.tag);
			const flatTownHalls = [...next.clan.members, ...next.opponent.members].map(mem => mem.townhallLevel);
			const [max, min] = [Math.max(...flatTownHalls), Math.min(...flatTownHalls)];
			const townHalls = Array(Math.max(Math.min(5, (max - min) + 1), 2)).fill(0).map((_, i) => max - i);

			embed.addField('\u200e', [
				`**Next War (Round #${next.round + 1})**`,
				`${EMOJIS.HASH} ${townHalls.map(th => ORANGE_NUMBERS[th]).join('')} **Clan**`,
				`${BLUE_NUMBERS[rank + 1]} ${this.getNextRoster(next.clan, townHalls)} ${next.clan.name}`,
				`${BLUE_NUMBERS[opprank + 1]} ${this.getNextRoster(next.opponent, townHalls)} ${next.opponent.name}`
			]);
		}

		if (next?.round || rounds.length === 7) {
			embed.addField('\u200b', `Rank #${rank + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`);
		}

		const msg = await message.util!.send({ embed });
		await msg.react(EMOJIS.HASH);

		const { id } = Util.parseEmoji(EMOJIS.HASH)!;
		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.id === id && user.id === message.author.id,
			{ max: 1, time: 60000, errors: ['time'] }
		).catch(() => null);

		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;

		embed.fields = [];
		embed.setFooter(`Clan War League ${moment(body.season).format('MMMM YYYY')}`)
			.setAuthor('CWL Roster')
			.setDescription('CWL Roster and Town-Hall Distribution');

		for (const clan of body.clans) {
			const reduced = clan.members.reduce((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {} as { [key: string]: number });

			const townHalls = Object.entries(reduced)
				.map(entry => ({ level: Number(entry[0]), total: Number(entry[1]) }))
				.sort((a, b) => b.level - a.level);

			embed.addField(`\u200e${clan.tag === clanTag ? `__${clan.name} (${clan.tag})__` : `${clan.name} (${clan.tag})`}`, [
				this.chunk(townHalls).map(
					chunks => chunks.map(
						th => `${TOWN_HALLS[th.level]} ${WHITE_NUMBERS[th.total]}\u200b`
					).join(' ')
				).join('\n')
			]);
		}

		return message.util!.send({ embed });
	}

	private chunk(items: { [key: string]: number }[]) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private getNextRoster(clan: WarClan, townHalls: number[]) {
		const roster = this.roster(clan);
		return townHalls.map(th => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private flat(tag: string, townHalls: number[], body: ClanWarLeagueGroup) {
		const roster = this.roster(body.clans.find(clan => clan.tag === tag)!);
		return townHalls.map(th => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private roster(clan: any) {
		return clan.members.reduce((count: any, member: any) => {
			const townHall = (member.townHallLevel || member.townhallLevel);
			count[townHall] = (count[townHall] as number || 0) + 1;
			return count;
		}, {} as { [key: string]: number });
	}

	private winner(clan: WarClan, opponent: WarClan) {
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
}
