import { CommandInteraction, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { PlayerItem } from 'clashofclans.js';
import { HERO_PETS, ORANGE_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

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

const PETS = Object.keys(HERO_PETS).reduce<Record<string, number>>((prev, curr, i) => {
	prev[curr] = i + 1;
	return prev;
}, {});

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'AttachFiles'],
			description: {
				content: 'Clan members with Town Halls and Heroes.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; option: string }) {
		const command = {
			discord: this.handler.modules.get('link-list')!,
			trophies: this.handler.modules.get('trophies')!,
			attacks: this.handler.modules.get('attacks')!
		}[args.option];
		if (command) return this.handler.exec(interaction, command, { tag: args.tag });

		const data = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!data) return;
		if (data.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: data.name }));
		}

		const fetched = (await this.client.http.detailedClanMembers(data.memberList)).filter((res) => res.ok);
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

		const embed = new EmbedBuilder()
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

		if (args.option === 'warPref') {
			const optedIn = members.filter((m) => m.warPreference);
			const optedOut = members.filter((m) => !m.warPreference);
			embed.setDescription(
				[
					`**OPTED-IN ~ ${optedIn.length}**`,
					optedIn
						.map(
							(m) =>
								`\u200e**✓** ${ORANGE_NUMBERS[m.townHallLevel]} \` ${Util.escapeBackTick(m.name).padEnd(15, ' ')} \u200f\``
						)
						.join('\n'),
					'',
					`**OPTED-OUT ~ ${optedOut.length}**`,
					optedOut
						.map((m) => `\u200e✘ ${ORANGE_NUMBERS[m.townHallLevel]} \` ${Util.escapeBackTick(m.name).padEnd(15, ' ')} \u200f\``)
						.join('\n')
				].join('\n')
			);
			embed.setFooter({ text: `War Preference (${optedIn.length}/${members.length})` });
		}

		const customId = this.client.uuid(interaction.user.id);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji('📥').setLabel('Download').setCustomId(customId).setStyle(ButtonStyle.Secondary)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => [customId].includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000,
			max: 1
		});

		collector.on('collect', async (action) => {
			if (action.customId === customId) {
				return this.handler.exec(action, this.handler.modules.get('export-members')!, { clans: data.tag });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customId);
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
