import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { PlayerItem } from 'clashofclans.js';
import { EMOJIS, ORANGE_NUMBERS } from '../../util/Emojis';
import { Command } from '../../lib';
import { Util } from '../../util';

const roleIds: { [key: string]: number } = {
	member: 1,
	admin: 2,
	coLeader: 3,
	leader: 4
};

const roleNames: Record<string, string> = {
	member: 'Mem',
	admin: 'Eld',
	coLeader: 'Co',
	leader: 'Lead'
};

const PETS: { [key: string]: number } = {
	'L.A.S.S.I': 1,
	'Electro Owl': 2,
	'Mighty Yak': 3,
	'Unicorn': 4
};

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'ATTACH_FILES'],
			description: {
				content: 'Clan members with Town Halls and Heroes.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; option: string }) {
		const data = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!data) return;
		if (data.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: data.name }));
		}

		const command = {
			discord: this.handler.modules.get('link-list')!,
			trophies: this.handler.modules.get('trophies')!
		}[args.option];
		if (command) return this.handler.exec(interaction, command, { tag: args.tag });

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched
			.filter((res) => res.ok)
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				warPreference: m.warPreference === 'in',
				role: {
					id: roleIds[m.role ?? data.memberList.find((mem) => mem.tag === m.tag)!.role],
					name: roleNames[m.role ?? data.memberList.find((mem) => mem.tag === m.tag)!.role]
				},
				townHallLevel: m.townHallLevel,
				heroes: m.heroes.length ? m.heroes.filter((a) => a.village === 'home') : [],
				pets: m.troops.filter((troop) => troop.name in PETS).sort((a, b) => PETS[a.name] - PETS[b.name])
			}));

		members
			.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setFooter({
				text: `Total ${fetched.length === data.members ? data.members : `${fetched.length}/${data.members}`}/50`
			})
			.setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.medium })
			.setDescription(
				[
					'```',
					`TH BK AQ GW RC  ${'NAME'}`,
					members
						.map((mem) => {
							const heroes = this.heroes(mem.heroes)
								.map((hero) => this.padStart(hero.level))
								.join(' ');
							return `${mem.townHallLevel.toString().padStart(2, ' ')} ${heroes}  \u200e${mem.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

		if (args.option === 'tags') {
			embed.setDescription(
				[
					'```',
					`\u200e${'TAG'.padStart(10, ' ')}  ${'NAME'}`,
					members.map((mem) => `\u200e${mem.tag.padStart(10, ' ')}  ${mem.name}`).join('\n'),
					'```'
				].join('\n')
			);
		}

		if (args.option === 'roles') {
			const _members = [...members].sort((a, b) => b.role.id - a.role.id);
			embed.setDescription(
				[
					'```',
					`\u200e ${'ROLE'.padEnd(4, ' ')}  ${'NAME'}`,
					_members.map((mem) => `\u200e ${mem.role.name.padEnd(4, ' ')}  ${mem.name}`).join('\n'),
					'```'
				].join('\n')
			);
		}

		const [discord, download, warPref] = [
			this.client.uuid(interaction.user.id),
			this.client.uuid(interaction.user.id),
			this.client.uuid(interaction.user.id)
		];

		const components = [
			new MessageActionRow()
				.addComponents(
					new MessageButton().setLabel('Discord Links').setCustomId(discord).setStyle('SECONDARY').setEmoji(EMOJIS.DISCORD)
				)
				.addComponents(new MessageButton().setEmoji('📥').setLabel('Download').setCustomId(download).setStyle('SECONDARY')),
			new MessageActionRow().addComponents(
				new MessageButton().setEmoji(EMOJIS.CROSS_SWORD).setLabel('War Preference').setCustomId(warPref).setStyle('SECONDARY')
			)
		];

		const msg = await interaction.editReply({ embeds: [embed], components });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => [discord, download, warPref].includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000,
			max: 1
		});

		collector.on('collect', async (action) => {
			if (action.customId === discord) {
				await action.deferUpdate();
				return this.handler.exec(action, this.handler.modules.get('link-list')!, { tag: data.tag });
			}

			if (action.customId === warPref) {
				const optedIn = members.filter((m) => m.warPreference);
				const optedOut = members.filter((m) => !m.warPreference);
				embed.setDescription(
					[
						`**OPTED-IN ~ ${optedIn.length}**`,
						optedIn
							.map(
								(m) =>
									`\u200e**✓** ${ORANGE_NUMBERS[m.townHallLevel]} \` ${Util.escapeBackTick(m.name).padEnd(
										15,
										' '
									)} \u200f\``
							)
							.join('\n'),
						'',
						`**OPTED-OUT ~ ${optedOut.length}**`,
						optedOut
							.map(
								(m) =>
									`\u200e✘ ${ORANGE_NUMBERS[m.townHallLevel]} \` ${Util.escapeBackTick(m.name).padEnd(15, ' ')} \u200f\``
							)
							.join('\n')
					].join('\n')
				);
				embed.setFooter({ text: `War Preference (${optedIn.length}/${members.length})` });
				await action.update({ embeds: [embed], components: [] });
			}

			if (action.customId === download) {
				return this.handler.exec(action, this.handler.modules.get('export-members')!, { tag: data.tag });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(discord);
			this.client.components.delete(download);
			this.client.components.delete(warPref);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private heroes(items: PlayerItem[]) {
		return Object.assign([{ level: '  ' }, { level: '  ' }, { level: '  ' }, { level: '  ' }], items);
	}

	private padStart(num: number | string) {
		return num.toString().padStart(2, ' ');
	}
}
