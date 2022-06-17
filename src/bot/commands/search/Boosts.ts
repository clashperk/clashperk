import { CommandInteraction, MessageButton, MessageActionRow, MessageSelectMenu, MessageEmbed } from 'discord.js';
import { Player } from 'clashofclans.js';
import { EMOJIS, SUPER_TROOPS } from '../../util/Emojis';
import { Command } from '../../lib';
import { Collections, BOOST_DURATION } from '../../util/Constants';
import { Util } from '../../util';
import RAW_TROOPS_DATA from '../../util/Troops';

export default class BoostsCommand extends Command {
	public constructor() {
		super('boosts', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Clan members with active super troops.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; value?: string; recent?: boolean }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (!clan.members) {
			return interaction.followUp({ content: `\u200e**${clan.name}** does not have any clan members...`, ephemeral: true });
		}

		const members = (await this.client.http.detailedClanMembers(clan.memberList)).filter((res) => res.ok);
		const players = members.filter((mem) => mem.troops.filter((en) => en.superTroopIsActive).length);
		if (!players.length) return interaction.followUp({ content: '**No members are boosting in this clan!**', ephemeral: true });

		const boostTimes = await this.client.db
			.collection<{ tag: string; lastSeen: Date; superTroops?: { name: string; timestamp: number }[] }>(Collections.LAST_SEEN)
			.find({ tag: { $in: players.map((m) => m.tag) } }, { projection: { _id: 0, tag: 1, superTroops: 1, lastSeen: 1 } })
			.toArray();

		const recently = boostTimes.filter((m) => m.lastSeen >= new Date(Date.now() - 10 * 60 * 1000)).map((m) => m.tag);

		const selected = players
			.filter((mem) => mem.troops.filter((en) => en.name === args.value && en.superTroopIsActive).length)
			.filter((m) => (recently.length && args.recent ? recently.includes(m.tag) : true)).length;

		const boosters = players.filter((m) => (recently.length && args.recent ? recently.includes(m.tag) : true));
		const memObj = boosters.reduce<{ [key: string]: { name: string; duration: number; online: boolean }[] }>((pre, curr) => {
			for (const troop of curr.troops) {
				if (troop.name in SUPER_TROOPS && troop.superTroopIsActive && (args.value && selected ? args.value === troop.name : true)) {
					if (!(troop.name in pre)) pre[troop.name] = [];
					const boosted = boostTimes.find((mem) => mem.tag === curr.tag)?.superTroops?.find((en) => en.name === troop.name);
					const duration = boosted?.timestamp ? BOOST_DURATION - (Date.now() - boosted.timestamp) : 0;
					pre[troop.name].push({ name: curr.name, duration: duration > 0 ? duration : 0, online: recently.includes(curr.tag) });
				}
			}
			return pre;
		}, {});

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction.guild.id))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
			.setDescription(
				`**Currently Boosted Super Troops**${args.recent && recently.length ? '\nRecently Active Members (~10m)' : ''}\n\u200b`
			);
		if (args.recent && recently.length) {
			embed.setFooter({
				text: `Total ${boosters.length}/${clan.members}`,
				iconURL: interaction.user.displayAvatarURL()
			});
		} else {
			embed.setFooter({
				text: `Total ${players.length}/${this.boostable(members)}/${clan.members}`,
				iconURL: interaction.user.displayAvatarURL()
			});
		}

		for (const [key, val] of Object.entries(memObj)) {
			embed.addField(
				`${SUPER_TROOPS[key]} ${key}`,
				Util.splitMessage(
					`${val
						.map(
							(mem) =>
								`\u200e${mem.name}${mem.duration ? ` (${Util.duration(mem.duration)})` : ''} ${
									mem.online ? EMOJIS.ONLINE : ''
								}`
						)
						.join('\n')}\n\u200b`,
					{ maxLength: 1024 }
				)[0]
			);
			embed.setTimestamp();
		}

		if (args.recent && !recently.length) {
			return interaction.followUp({
				ephemeral: true,
				content: '**No recently active members are boosting in this clan.**'
			});
		}

		if (args.value && !selected) {
			return interaction.followUp({
				ephemeral: true,
				content: `**No ${args.recent ? 'recently active ' : ''}members are boosting ${args.value} in this clan.**`
			});
		}

		const buttons = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setEmoji(EMOJIS.REFRESH)
					.setStyle('SECONDARY')
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id }))
			)
			.addComponents(
				new MessageButton()
					.setLabel('Recently Active')
					.setStyle('SECONDARY')
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, recent: true }))
			);

		const menus = new MessageActionRow().addComponents(
			new MessageSelectMenu()
				.setPlaceholder('Select a super troop!')
				.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, recent: Boolean(args.recent), menu: true }))
				.addOptions(Object.entries(SUPER_TROOPS).map(([key, value]) => ({ label: key, value: key, emoji: value })))
		);

		return interaction.editReply({ embeds: [embed], components: [buttons, menus] });
	}

	private boostable(players: Player[]) {
		const superTroops = RAW_TROOPS_DATA.SUPER_TROOPS;
		return players
			.filter((en) => en.townHallLevel >= 11)
			.reduce((pre, curr) => {
				const troops = superTroops.filter((unit) =>
					curr.troops.find((un) => un.village === 'home' && un.name === unit.original && un.level >= unit.minOriginalLevel)
				);
				return pre + (troops.length ? 1 : 0);
			}, 0);
	}
}
