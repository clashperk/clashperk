import { ClanWar, WarClan, ClanWarMember } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Message, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';

export default class WarSummaryCommand extends Command {
	public constructor() {
		super('war-summary', {
			aliases: ['matches', 'wars'],
			category: 'none',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'],
			description: {}
		});
	}

	public async exec(message: Message) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();
		if (!clans.length) return message.util!.send(`**${message.guild!.name} does not have any clans. Why not add some?**`);

		const embed = new MessageEmbed();
		for (const clan of clans) {
			const data = await this.getWAR(clan.tag) as ClanWar;
			if (!data.ok) continue;
			if (data.state === 'notInWar') continue;

			// @ts-expect-error
			const header = data.round ? `\u200e${data.clan.name} (${data.clan.tag})` : `\u200e${data.clan.name} vs ${data.opponent.name}`;
			embed.addField(header, [
				`${this.getLeaderBoard(data.clan, data.opponent, data.teamSize)}`,
				'\u200b'
			].join('\n'));
		}

		if (!embed.length) return message.util!.send('Clans are not in war!');

		return Array(Math.ceil(embed.fields.length / 15)).fill(0)
			.map(
				() => embed.fields.splice(0, 15)
			)
			.map(
				fields => new MessageEmbed({ color: this.client.embed(message), fields })
			)
			.map(
				(embed, index) => {
					if (index === 0) {
						return message.util!.send({ embeds: [embed] });
					}
					return message.channel.send({ embeds: [embed] });
				}
			);
	}

	private get onGoingCWL() {
		return new Date().getDate() >= 1 && new Date().getDate() <= 10;
	}

	private getWAR(clanTag: string) {
		if (this.onGoingCWL) return this.getCWL(clanTag);
		return this.client.http.currentClanWar(clanTag);
	}

	private async getCWL(clanTag: string) {
		const res = await this.client.http.clanWarLeague(clanTag);
		if (res.statusCode === 504) return { statusCode: 504 };
		if (!res.ok) return this.client.http.currentClanWar(clanTag);
		const rounds = res.rounds.filter(d => !d.warTags.includes('#0'));

		const chunks = [];
		for (const { warTags } of rounds.slice(-2)) {
			for (const warTag of warTags) {
				const data = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;
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
		const roster = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const flatTownHalls = members.map(mem => mem.townhallLevel);
		const [max, min] = [Math.max(...flatTownHalls), Math.min(...flatTownHalls)];
		const townHalls = Array(Math.min(4, (max - min) + 1)).fill(0).map((_, i) => max - i);
		return townHalls.map(num => (roster[num] || 0).toString().padStart(2, ' ')).join('|');
	}

	// Calculates War Result
	private result(clan: WarClan, opponent: WarClan) {
		const tied = clan.stars === opponent.stars && clan.destructionPercentage === opponent.destructionPercentage;
		if (tied) return 'tied';
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return 'won';
		return 'lost';
	}

	private getLeaderBoard(clan: WarClan, opponent: WarClan, teamSize: number) {
		return [
			`\`\u200e${this.value(clan.stars, teamSize * 3).padStart(13, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${this.value(opponent.stars, teamSize * 3).padEnd(13, ' ')}\u200f\``,
			`\`\u200e${this.value(clan.attacks, teamSize * 2).padStart(13, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.SWORD} \u2002 \`\u200e ${this.value(opponent.attacks, teamSize * 2).padEnd(13, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(13, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.FIRE} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(13, ' ')}\u200f\``,
			`\`\u200e${this.roster(clan.members).padStart(13, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.TOWNHALL} \u2002 \`\u200e ${this.roster(opponent.members).padEnd(13, ' ')}\u200f\``
		].join('\n');
	}

	private value(a: number, b: number) {
		return [a.toString(), b.toString()].join('/');
	}
}
