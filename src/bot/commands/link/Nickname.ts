import { GuildMember, ActionRowBuilder, CommandInteraction, ComponentType, StringSelectMenuBuilder } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { TOWN_HALLS } from '../../util/Emojis.js';
import { Collections, Settings } from '../../util/Constants.js';

export default class NickNameCommand extends Command {
	public constructor() {
		super('nickname', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Sets nickname of a member in Discord.']
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			user: {
				id: 'member',
				match: 'MEMBER'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { member?: GuildMember; format?: string }) {
		const { member } = args;
		if (!member) {
			return interaction.editReply(this.i18n('command.nickname.invalid_member', { lng: interaction.locale }));
		}

		if (member.id !== interaction.user.id && !interaction.member.permissions.has('ManageNicknames')) {
			return interaction.editReply(this.i18n('command.nickname.missing_permission', { lng: interaction.locale }));
		}

		if (
			interaction.guild.members.me!.roles.highest.position <= member.roles.highest.position ||
			member.id === interaction.guild.ownerId
		) {
			const own = member.id === interaction.user.id;
			return interaction.editReply(
				this.i18n(own ? 'command.nickname.missing_access_self' : 'command.nickname.missing_access_other', {
					lng: interaction.locale
				})
			);
		}

		const players = await this.client.resolver.getPlayers(member.user.id);
		if (!players.length) {
			return interaction.editReply(this.i18n('command.nickname.no_players', { lng: interaction.locale, user: member.user.tag }));
		}

		let format = this.client.settings.get<string>(interaction.guildId, Settings.NICKNAME_EXPRESSION, '{NAME}');
		if (format && args.format && format !== args.format) format = args.format;

		if (/{NAME}/gi.test(format)) {
			this.client.settings.set(interaction.guildId, Settings.NICKNAME_EXPRESSION, args.format);
		} else {
			return interaction.editReply(`Invalid nickname format \`${format}\`, a nickname format must include \`{NAME}\``);
		}

		const options = players.map((op) => ({
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel],
			description: `${op.tag}`
		}));

		const customId = this.client.uuid(interaction.user.id, member.id);
		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('Select an account!').addOptions(options)
		);

		const msg = await interaction.editReply({
			content: [`**Setting up ${member.user.tag}\'s nickname...**`, '', `**Format:** ${format}`].join('\n'),
			components: [row]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => action.customId === customId && [member.id, interaction.user.id].includes(action.user.id),
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.isStringSelectMenu() && action.customId === customId) {
				const player = players.find((p) => p.tag === action.values.at(0))!;
				const clan = player.clan
					? await this.client.db.collection(Collections.CLAN_STORES).findOne({ tag: player.clan.tag, guild: interaction.guildId })
					: null;

				const name = this.getName(
					{
						name: player.name,
						townHallLevel: player.townHallLevel,
						role: player.role,
						clan: clan?.alias
					},
					format
				);

				if (name.length > 31) {
					await action.reply({
						ephemeral: true,
						content: this.i18n('command.nickname.char_limit', { lng: interaction.locale })
					});
				} else {
					await member.setNickname(name, `Nickname set by ${interaction.user.tag}`).catch(() => null);
					row.components.at(0)!.setDisabled(true);
					await action.update({
						components: [row],
						content: `**${member.user.tag}\'s** nickname set to **${name}**`
					});
				}
			}
		});

		collector.on('end', () => {
			this.client.components.delete(customId);
		});
	}

	private getName(
		player: {
			name: string;
			townHallLevel: number;
			role?: string;
			clan?: string;
		},
		format: string
	) {
		return format
			.replace(/{NAME}/gi, player.name)
			.replace(/{TH}/gi, player.townHallLevel.toString())
			.replace(/{ROLE}/gi, player.role ?? '')
			.replace(/{CLAN_ABB}/gi, player.clan ?? '')
			.replace(/{ALIAS}/gi, player.clan ?? '')
			.replace(/{CLAN}/gi, player.clan ?? '')
			.replace(/{CLAN_ALIAS}/gi, player.clan ?? '');
	}
}
