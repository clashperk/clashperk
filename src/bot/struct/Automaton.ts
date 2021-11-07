import { ButtonInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
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

	public async exec(interaction: ButtonInteraction | SelectMenuInteraction) {
		const match = new RegExp(/(?<command>^BOOSTER|DONATION)(?<tag>(#[PYLQGRJCUV0289]+))_(?<order>(ASC|DESC))/)
			.exec(interaction.customId);
		if (!(match?.groups?.tag && match.groups.command && match.groups.order)) return false;

		switch (match.groups.command) {
			case 'BOOSTER': {
				const buttons = new MessageActionRow()
					.addComponents(
						new MessageButton()
							.setLabel('Refresh')
							.setStyle('SECONDARY')
							.setCustomId(`BOOSTER${match.groups.tag}_ASC`)
					)
					.addComponents(
						new MessageButton()
							.setLabel('Recently Active')
							.setStyle('SECONDARY')
							.setCustomId(`BOOSTER${match.groups.tag}_DESC`)
					);

				const menus = new MessageActionRow()
					.addComponents(
						new MessageSelectMenu()
							.setPlaceholder('Select a super troop!')
							.setCustomId(`BOOSTER${match.groups.tag}_${match.groups.order}_MENU`)
							.addOptions(Object.entries(SUPER_TROOPS).map(([key, value]) => ({ label: key, value: key, emoji: value })))
					);

				await interaction.update({ components: [], content: `**Fetching data... ${EMOJIS.LOADING}**`, embeds: [] });
				const msg = await this.getBoosterEmbed(interaction, match.groups.tag, match.groups.order === 'DESC');
				await interaction.editReply({
					content: msg.content, embeds: msg.embeds,
					components: msg.embeds.length ? [buttons, menus] : []
				});

				if (msg.noActive && match.groups.order === 'DESC') {
					await interaction.followUp({ ephemeral: true, content: '**No recently active members are boosting in this clan.**' });
				}

				if (msg.noValue && interaction.isSelectMenu()) {
					await interaction.followUp({
						ephemeral: true,
						content: `**No ${match.groups.order === 'DESC' ? 'recently active ' : ''}members are boosting ${interaction.values[0]} in this clan.**`
					});
				}

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

	public async getBoosterEmbed(interaction: ButtonInteraction | SelectMenuInteraction | Message, tag: string | Clan, recent = false) {
		const data = typeof tag === 'string' ? await this.client.http.clan(tag) : tag;
		if (!data.ok) return { embeds: [], content: `**${status(data.statusCode)}**` };
		const members = (await this.client.http.detailedClanMembers(data.memberList))
			.filter(res => res.ok);

		const players = members.filter(mem => mem.troops.filter(en => en.superTroopIsActive).length);
		if (!players.length) return { content: '**No members are boosting in this clan!**', embeds: [] };

		const boostTimes = (await this.client.db.collection(Collections.LAST_SEEN)
			.find(
				{ tag: { $in: players.map(m => m.tag) } },
				{ projection: { _id: 0, tag: 1, superTroops: 1, lastSeen: 1 } }
			)
			.toArray<{ tag: string; lastSeen: Date; superTroops?: { name: string; timestamp: number }[] }>());

		const lastSeen = boostTimes.filter(m => m.lastSeen >= new Date(Date.now() - (10 * 60 * 1000)))
			.map(m => m.tag);

		const value = (interaction instanceof SelectMenuInteraction && interaction.isSelectMenu()) ? interaction.values[0] : null;
		const thisTroop = players.filter(
			mem => mem.troops.filter(
				en => en.name === value && en.superTroopIsActive
			).length
		).filter(m => (lastSeen.length && recent) ? lastSeen.includes(m.tag) : true).length;

		const boosters = players.filter(m => (lastSeen.length && recent) ? lastSeen.includes(m.tag) : true);
		const memObj = boosters.reduce((pre, curr) => {
			for (const troop of curr.troops) {
				if (troop.name in SUPER_TROOPS && troop.superTroopIsActive && ((value && thisTroop) ? value === troop.name : true)) {
					if (!(troop.name in pre)) pre[troop.name] = [];
					const boosted = boostTimes.find(mem => mem.tag === curr.tag)?.superTroops?.find(en => en.name === troop.name);
					const duration = boosted?.timestamp ? (BOOST_DURATION - (Date.now() - boosted.timestamp)) : 0;
					pre[troop.name].push({ name: curr.name, duration, online: lastSeen.includes(curr.tag) });
				}
			}
			return pre;
		}, {} as { [key: string]: { name: string; duration: number; online: boolean }[] });

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction.guild!.id))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setDescription(`**Currently Boosted Super Troops**${recent && lastSeen.length ? '\nRecently Active Members (~10m)' : ''}\n\u200b`);
		if (recent && lastSeen.length) embed.setFooter(`Total ${boosters.length}/${data.members}`, interaction.author.displayAvatarURL());
		else embed.setFooter(`Total ${players.length}/${this.boostable(members)}/${data.members}`, interaction.author.displayAvatarURL());

		for (const [key, val] of Object.entries(memObj)) {
			embed.addField(
				`${SUPER_TROOPS[key]} ${key}`,
				`${val.map(mem => `\u200e${mem.name}${mem.duration ? ` (${Util.duration(mem.duration)})` : ''} ${mem.online ? EMOJIS.ONLINE : ''}`).join('\n')}\n\u200b`
			);
		}

		return { embeds: [embed], content: null, noActive: !lastSeen.length, noValue: !thisTroop };
	}

	private boostable(players: Player[]) {
		const superTroops = RAW_TROOPS_DATA.SUPER_TROOPS;
		return players.filter(en => en.townHallLevel >= 11).reduce((pre, curr) => {
			const troops = superTroops.filter(
				unit => curr.troops.find(
					un => un.village === 'home' && un.name === unit.original && un.level >= unit.minOriginalLevel
				)
			);
			return pre + (troops.length ? 1 : 0);
		}, 0);
	}

	private async getDonationEmbed(interaction: ButtonInteraction | SelectMenuInteraction | Message, tag: string | Clan, order: 'ASC' | 'DESC') {
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

			const m = dbMembers.find(m => m.tag === mem.tag);
			if (m) {
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
