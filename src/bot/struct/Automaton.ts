import { ButtonInteraction, Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Collections, status } from '../util/Constants';
import { EMOJIS, SUPER_TROOPS } from '../util/Emojis';
import RAW_TROOPS_DATA from '../util/TroopsInfo';
import { Clan, Player } from 'clashofclans.js';
import { Season, Util } from '../util/Util';
import Client from '../struct/Client';

const BOOST_DURATION = 3 * 24 * 60 * 60 * 1000;

export class Automaton {
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	public async exec(interaction: ButtonInteraction) {
		const match = new RegExp(/(?<command>^BOOSTER|DONATION)(?<tag>(#[PYLQGRJCUV0289]+))_(?<order>(ASC|DESC))/)
			.exec(interaction.customId);
		if (!(match?.groups?.tag && match.groups.command && match.groups.order)) return false;

		switch (match.groups.command) {
			case 'BOOSTER': {
				const button = new MessageButton()
					.setLabel('Refresh')
					.setStyle('SECONDARY')
					.setCustomId(`BOOSTER${match.groups.tag}_ASC`);

				await interaction.update({ components: [], content: `**Fetching data... ${EMOJIS.LOADING}**`, embeds: [] });
				const msg = await this.getBoosterEmbed(interaction, match.groups.tag);
				await interaction.editReply({
					content: msg.content, embeds: msg.embeds,
					components: msg.embeds.length ? [new MessageActionRow({ components: [button] })] : []
				});

				return true;
			}
			case 'DONATION': {
				const button = new MessageButton()
					.setLabel('Refresh')
					.setStyle('SECONDARY')
					.setCustomId(`DONATION${match.groups.tag}_ASC`);

				await interaction.update({ components: [], content: `**Fetching data... ${EMOJIS.LOADING}**`, embeds: [] });
				const msg = await this.getDonationEmbed(interaction, match.groups.tag, match.groups.order as 'ASC' | 'DESC');
				await interaction.editReply({
					content: msg.content, embeds: msg.embeds,
					components: msg.embeds.length ? [new MessageActionRow({ components: [button] })] : []
				});

				return true;
			}
			default: {
				return false;
			}
		}
	}

	public async getBoosterEmbed(interaction: ButtonInteraction | Message, tag: string | Clan) {
		const data = typeof tag === 'string' ? await this.client.http.clan(tag) : tag;
		if (!data.ok) return { embeds: [], content: `**${status(data.statusCode)}**` };
		const members = (await this.client.http.detailedClanMembers(data.memberList))
			.filter(res => res.ok);

		const boosting = members.filter(mem => mem.troops.filter(en => en.superTroopIsActive).length);
		if (!boosting.length) return { content: '**No members are boosting in this clan!**', embeds: [] };

		const boostTimes = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ season: Season.ID, clanTag: data.tag, tag: { $in: data.memberList.map(mem => mem.tag) } })
			.toArray() as { tag: string; superTroops?: { name: string; timestamp: number }[] }[];

		const memObj = boosting.reduce((pre, curr) => {
			for (const troop of curr.troops) {
				if (troop.name in SUPER_TROOPS && troop.superTroopIsActive) {
					if (!(troop.name in pre)) pre[troop.name] = [];
					const boosted = boostTimes.find(mem => mem.tag === curr.tag)?.superTroops?.find(en => en.name === troop.name);
					const duration = boosted?.timestamp ? (BOOST_DURATION - (Date.now() - boosted.timestamp)) : 0;
					pre[troop.name].push({ name: curr.name, duration });
				}
			}
			return pre;
		}, {} as { [key: string]: { name: string; duration: number }[] });

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction.guild!.id))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setDescription('**Currently Boosted Super Troops**\n\u200b')
			.setFooter(`Total ${boosting.length}/${this.boostable(members)}/${data.members}`, interaction.author.displayAvatarURL());

		for (const [key, val] of Object.entries(memObj)) {
			embed.addField(
				`${SUPER_TROOPS[key]} ${key}`,
				`${val.map(mem => `\u200e${mem.name}${mem.duration ? ` (${Util.duration(mem.duration)})` : ''}`).join('\n')}\n\u200b`
			);
		}

		return { embeds: [embed], content: null };
	}

	private boostable(players: Player[]) {
		const superTrops = RAW_TROOPS_DATA.SUPER_TROOPS;
		return players.filter(en => en.townHallLevel >= 11).reduce((pre, curr) => {
			const troops = superTrops.filter(
				unit => curr.troops.find(
					un => un.village === 'home' && un.name === unit.original && un.level >= unit.minOriginalLevel
				)
			);
			return pre + (troops.length ? 1 : 0);
		}, 0);
	}

	private async getDonationEmbed(interaction: ButtonInteraction, tag: string | Clan, order: 'ASC' | 'DESC') {
		const data = typeof tag === 'string' ? await this.client.http.clan(tag) : tag;
		if (!data.ok) return { embeds: [], content: `**${status(data.statusCode)}**` };
		if (!data.members) return { embeds: [], content: `\u200e**${data.name}** does not have any clan members...` };

		const dbMembers = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ season: Season.ID, clanTag: data.tag, tag: { $in: data.memberList.map(m => m.tag) } })
			.toArray();

		const members: { tag: string; name: string; donated: number; received: number }[] = [];
		for (const mem of data.memberList) {
			if (!dbMembers.find(m => m.tag === mem.tag)) {
				members.push({ name: mem.name, tag: mem.tag, donated: mem.donations, received: mem.donationsReceived });
			}

			if (dbMembers.find(m => m.tag === mem.tag)) {
				const m = dbMembers.find(m => m.tag === mem.tag);
				members.push({
					name: mem.name,
					tag: mem.tag,
					donated: mem.donations >= m.donations?.value
						? m.donations.gained as number + (mem.donations - m.donations.value)
						: mem.donations,

					received: mem.donationsReceived >= m.donationsReceived?.value
						? m.donationsReceived.gained as number + (mem.donationsReceived - m.donationsReceived.value)
						: mem.donationsReceived
				});
			}
		}

		const receivedMax = Math.max(...members.map(m => m.received));
		const rs = receivedMax > 99999 ? 6 : receivedMax > 999999 ? 7 : 5;
		const donatedMax = Math.max(...members.map(m => m.donated));
		const ds = donatedMax > 99999 ? 6 : donatedMax > 999999 ? 7 : 5;

		members.sort((a, b) => b.donated - a.donated);
		const donated = members.reduce((pre, mem) => mem.donated + pre, 0);
		const received = members.reduce((pre, mem) => mem.received + pre, 0);

		if (order === 'DESC') {
			members.sort((a, b) => b.received - a.received);
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction.guild!.id))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'```',
				`\u200e # ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'}`,
				members.map((mem, index) => {
					const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
					return `${(index + 1).toString().padStart(2, ' ')} ${donation}  \u200e${this.padEnd(mem.name.substring(0, 15))}`;
				}).join('\n'),
				'```'
			].join('\n'));

		embed.setFooter(`[DON ${donated} | REC ${received}] (Season ${Season.ID})`, interaction.author.displayAvatarURL());

		return { embeds: [embed], content: null };
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\');
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}
}
