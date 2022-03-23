import { GuildMember, MessageActionRow, MessageSelectMenu, CommandInteraction } from 'discord.js';
import { Args, Command } from '../../lib';
import { UserInfo } from '../../types';
import { Collections } from '../../util/Constants';
import { TOWN_HALLS } from '../../util/Emojis';

export default class SetNickNameCommand extends Command {
	public constructor() {
		super('setnick', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			description: {
				content: [
					'Sets nickname of a member in discord.',
					'',
					'Must include "|" to add a prefix or suffix of the nickname.',
					'Prefix ends with "|" and Suffix starts with "|"'
				]
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
			return interaction.editReply('**You must mention a valid member to use this command.**');
		}

		if (member.id !== interaction.user.id && !interaction.member.permissions.has('MANAGE_NICKNAMES')) {
			return interaction.editReply('**You are missing `Manage Nicknames` permission to use this command.**');
		}

		if (interaction.guild.me!.roles.highest.position <= member.roles.highest.position || member.id === interaction.guild.ownerId) {
			const own = member.id === interaction.user.id;
			return interaction.editReply(
				`**I do not have permission to change ${own ? 'your ' : ''}nickname${own ? '.' : ' of this member!'}**`
			);
		}

		const players = await this.getPlayers(member.user.id);
		if (!players.length) {
			return interaction.editReply(`**No player accounts are linked to ${member.user.tag}**`);
		}

		const options = players.map((op) => ({
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel],
			description: `${op.tag}`
		}));
		const customID = this.client.uuid(interaction.user.id, member.id);
		const row = new MessageActionRow().addComponents(
			new MessageSelectMenu().setCustomId(customID).setPlaceholder('Select an account!').addOptions(options)
		);

		const msg = await interaction.editReply({ content: `**Setting up ${member.user.tag}\'s nickname...**`, components: [row] });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customID && [member.id, interaction.user.id].includes(action.user.id),
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.isSelectMenu() && action.customId === customID) {
				const name = this.getName(options.find((opt) => opt.value === action.values[0])!.label, txt);
				if (name.length > 31) {
					await action.reply({
						ephemeral: true,
						content: '**Nickname must be 31 or fewer in length.**'
					});
				} else {
					await member.setNickname(name, `Nickname set by ${interaction.user.tag}`).catch(() => null);

					row.components[0].setDisabled(true);
					return action.update({
						components: [row],
						content: `**${member.user.tag}\'s** nickname set to **${name}**`
					});
				}
			}
		});

		collector.on('end', () => {
			this.client.components.delete(customID);
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

	public async getPlayers(userId: string) {
		const data = await this.client.db.collection<UserInfo>(Collections.LINKED_PLAYERS).findOne({ user: userId });
		const others = await this.client.http.getPlayerTags(userId);

		const playerTagSet = new Set([...(data?.entries ?? []).map((en) => en.tag), ...others.map((tag) => tag)]);

		return (
			await Promise.all(
				Array.from(playerTagSet)
					.slice(0, 25)
					.map((tag) => this.client.http.player(tag))
			)
		).filter((res) => res.ok);
	}
}
