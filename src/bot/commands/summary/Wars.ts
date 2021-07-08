import { ClanWar, WarClan } from 'clashofclans.js';
import { Message, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import moment from 'moment';

const states: { [key: string]: string } = {
	inWar: 'Ends',
	preparation: 'Starts',
	warEnded: 'Ended'
};

export default class WarSummaryCommand extends Command {
	public constructor() {
		super('war-summary', {
			aliases: ['matches', 'wars'],
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
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
			const data = await this.getWAR(clan.tag) as ClanWar & { round?: number };
			if (!data.ok) continue;
			if (data.state === 'notInWar') continue;

			embed.addField(`${data.clan.name} ${data.round ? `(CWL Round #${data.round})` : ''}`, [
				`${this.getLeaderBoard(data.clan, data.opponent)}`,
				`${states[data.state]} on ${this.getRelativeTime(moment(data.preparationStartTime).toDate().getTime())}`,
				'\u200b'
			].join('\n'));
		}

		if (!embed.length) return message.util!.send('**No clans are in war at this moment!**');
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

	public getRelativeTime(ms: number) {
		return `<t:${Math.floor(ms / 1000)}:f>`;
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

	private getLeaderBoard(clan: WarClan, opponent: WarClan) {
		return [
			`${EMOJIS.STAR} ${clan.stars}/${opponent.stars}`,
			`${EMOJIS.SWORD} ${clan.attacks}/${opponent.attacks}`,
			`${EMOJIS.FIRE} ${clan.destructionPercentage.toFixed(2)}%/${opponent.destructionPercentage.toFixed(2)}%`
		].join(' ');
	}
}
