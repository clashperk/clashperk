import { Command } from 'discord-akairo';
import { ClanWar, ClanWarClan, ClanWarLeague, ClanWarLeagueWar, ClanWarMember, ClanWarOpponent } from 'clashofclans.js';
import { Message, MessageEmbed } from 'discord.js';
import { COLLECTIONS } from '../../util/Constants';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis';

export default class WarSummaryCommand extends Command {
	public constructor() {
		super('matches', {
			aliases: ['matches', 'wars'],
			category: 'activity_',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES'],
			description: {}
		});
	}

	public async exec(message: Message) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const clans = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();
		if (!clans.length) return message.util!.send('No clans are linked. Why not add some?');

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${message.guild!.name} Wars`, message.guild!.iconURL({ dynamic: true })!);
		for (const clan of clans) {
			const data: ClanWar = await this.getWAR(clan.tag);
			if (data.statusCode === 504) {
				embed.addField('__Searching for Battle__', [
					`${clan.name as string} (${clan.tag as string})`,
					'\u200b'
				]);
			}

			if (!data.ok) {
				embed.addField('__Private War Log__', [
					`${clan.name as string} (${clan.tag as string})`,
					'\u200b'
				]);
			}

			if (data.state === 'notInWar') {
				embed.addField('__Not in War__', [
					`${clan.name as string} (${clan.tag as string})`,
					'\u200b'
				]);
			}

			// @ts-expect-error
			const header = data.round ? `__CWL (Round ${data.round as number})__` : '__Regular War__';
			if (data.state === 'preparation') {
				embed.addField(header, [
					`\u200e${data.clan.name} (${data.clan.tag})`,
					`${this.roster(data.clan.members)}`,
					'',
					`**War Against**`,
					`\u200e${data.opponent.name} (${data.opponent.tag})`,
					`${this.roster(data.opponent.members)}`
				]);
			}

			if (data.state === 'inWar') {
				embed.addField(header, [
					`\u200e${data.clan.name} (${data.clan.tag})`,
					`${this.roster(data.clan.members)}`,
					'',
					`**War Against**`,
					`\u200e${data.opponent.name} (${data.opponent.tag})`,
					`${this.roster(data.opponent.members)}`
				]);
			}

			if (data.state === 'warEnded') {
				embed.addField(header, [
					`\u200e${data.clan.name} (${data.clan.tag})`,
					`${this.roster(data.clan.members)}`,
					'',
					`**War Against**`,
					`\u200e${data.opponent.name} (${data.opponent.tag})`,
					`${this.roster(data.opponent.members)}`
				]);
			}
		}

		return message.util!.send({ embed });
	}

	private get onGoingCWL() {
		return new Date().getDate() >= 1 && new Date().getDate() <= 10;
	}

	private getWAR(clanTag: string) {
		if (this.onGoingCWL) return this.getCWL(clanTag);
		return this.client.http.currentClanWar(clanTag);
	}

	private async getCWL(clanTag: string) {
		const res: ClanWarLeague = await this.client.http.clanWarLeague(clanTag);
		if (res.statusCode === 504) return { statusCode: 504 };
		if (!res.ok) return this.client.http.currentClanWar(clanTag);
		const rounds = res.rounds.filter(d => !d.warTags.includes('#0'));

		const chunks = [];
		for (const { warTags } of rounds.slice(-2)) {
			for (const warTag of warTags) {
				const data: ClanWarLeagueWar = await this.client.http.clanWarLeagueWar(warTag);
				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					chunks.push({
						...data,
						round: res.rounds.findIndex(d => d.warTags.includes(warTag)) + 1,
						clan: data.clan.tag === clanTag ? data.clan : data.opponent,
						opponent: data.clan.tag === clanTag ? data.opponent : data.clan
					});
					break;
				}
			}
		}

		if (!chunks.length) return { statusCode: 504 };
		return chunks.find(en => en.state === 'inWar') ?? chunks.find(en => en.state === 'preparation') ?? chunks.find(en => en.state === 'warEnded');
	}

	private roster(members: ClanWarMember[]) {
		const compo = Array(13).fill('')
			.map((_, i) => i + 1)
			.reduce((count, num) => {
				count[num] = 0;
				return count;
			}, {} as { [key: string]: number });

		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, compo);

		const townHalls = [];

		let locked = false;
		for (const [key, val] of Object.entries(reduced)) {
			if (val === 0 && !locked) continue;
			locked = true;
			townHalls.push({ level: Number(key), total: val });
		}

		return this.chunk(townHalls)
			.map(chunks => chunks.map(en => `${TOWN_HALLS[en.level]} \`\u200e${en.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n');
	}

	private chunk<T>(items: Array<T> = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	// Calculates War Result
	private result(clan: ClanWarClan, opponent: ClanWarOpponent) {
		const tied = clan.stars === opponent.stars && clan.destructionPercentage === opponent.destructionPercentage;
		if (tied) return 'tied';
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return 'won';
		return 'lost';
	}
}
