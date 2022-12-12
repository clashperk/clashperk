import { GuildMember, ActionRowBuilder, SelectMenuBuilder, CommandInteraction, ComponentType } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { TOWN_HALLS } from '../../util/Emojis.js';

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

	public async exec(interaction: CommandInteraction<'cached'>, { txt, member }: { txt?: string; member?: GuildMember }) {
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

		const options = players.map((op) => ({
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel],
			description: `${op.tag}`
		}));
		const customId = this.client.uuid(interaction.user.id, member.id);
		const row = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
			new SelectMenuBuilder().setCustomId(customId).setPlaceholder('Select an account!').addOptions(options)
		);

		const msg = await interaction.editReply({ content: `**Setting up ${member.user.tag}\'s nickname...**`, components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => action.customId === customId && [member.id, interaction.user.id].includes(action.user.id),
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.isSelectMenu() && action.customId === customId) {
				const name = this.getName(options.find((opt) => opt.value === action.values[0])!.label, txt);
				if (name.length > 31) {
					await action.reply({
						ephemeral: true,
						content: this.i18n('command.nickname.char_limit', { lng: interaction.locale })
					});
				} else {
					await member.setNickname(name, `Nickname set by ${interaction.user.tag}`).catch(() => null);

					row.components[0].setDisabled(true);
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

	private getName(name: string, txt?: string) {
		if (txt?.length && txt.trim().startsWith('|')) {
			name = `${name} ${txt}`;
		} else if (txt?.length && txt.trim().endsWith('|')) {
			name = `${txt} ${name}`;
		}

		return name;
	}
}
