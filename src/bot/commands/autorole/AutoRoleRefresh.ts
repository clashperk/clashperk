import { Settings } from '@app/constants';
import { ButtonInteraction, CommandInteraction, EmbedBuilder, Role, User } from 'discord.js';
import moment from 'moment';
import { cluster } from 'radash';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { handleMessagePagination } from '../../util/Pagination.js';

export default class AutoTownHallRoleCommand extends Command {
	public constructor() {
		super('autorole-refresh', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles', 'SendMessagesInThreads', 'SendMessages', 'ViewChannel', 'UseExternalEmojis'],
			defer: true,
			roleKey: Settings.LINKS_MANAGER_ROLE
		});
	}

	public async pre(interaction: ButtonInteraction | CommandInteraction) {
		if (interaction.isButton()) this.ephemeral = true;
		else this.ephemeral = false;
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: { is_test_run?: boolean; user_or_role?: User | Role }
	) {
		const inProgress = this.client.rolesManager.getChangeLogs(interaction.guildId);
		if (inProgress) {
			return interaction.editReply('Role refresh is currently being processed.');
		}

		if (this.client.rpcHandler.isInMaintenance) {
			return interaction.editReply('Command is blocked due to ongoing maintenance break.');
		}

		const refreshCounter = {
			startTime: Date.now(),
			attempts: 0
		};

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(`### Refreshing Server Roles ${EMOJIS.LOADING}`);
		embed.setFooter({ text: `Progress: (0%)${args.is_test_run ? ' [TestRun]' : ''}` });

		const message = await interaction.editReply({ embeds: [embed] });

		const handleChanges = async (closed = false) => {
			const changes = this.client.rolesManager.getChangeLogs(interaction.guildId);
			if (!changes) return null;

			if (closed) embed.setDescription('### Roles Refreshed Successfully');
			const percentage = ((changes.progress / changes.memberCount) * 100).toFixed(2);
			embed.setFooter({
				text: [
					`Time Elapsed: ${moment
						.duration(Date.now() - refreshCounter.startTime)
						.format('h[h] m[m] s[s]', { trim: 'both mid' })}`,
					`Progress: ${changes.progress}/${changes.memberCount} (${percentage}%)${args.is_test_run ? ' [TestRun]' : ''}`
				].join('\n')
			});
			refreshCounter.attempts += 1;

			const roleChanges = this.client.rolesManager.getFilteredChangeLogs(changes);
			const embeds: EmbedBuilder[] = [];

			cluster(roleChanges, 20).forEach((changes) => {
				const roleChangeEmbed = new EmbedBuilder(embed.toJSON());
				changes.forEach(({ included, excluded, nickname, userId, displayName }, itemIndex) => {
					const values = [`> \u200e${displayName} | <@${userId}>`];
					if (included.length) values.push(`**+** ${included.map((id) => `<@&${id}>`).join(' ')}`);
					if (excluded.length) values.push(`**-** ~~${excluded.map((id) => `<@&${id}>`).join(' ')}~~`);
					if (nickname) values.push(nickname);

					roleChangeEmbed.addFields({
						name: itemIndex === 0 ? `Changes Detected: ${roleChanges.length}\n\u200b` : '\u200b',
						value: values.join('\n')
					});
				});
				embeds.push(roleChangeEmbed);
			});

			if (interaction.isButton()) {
				return interaction.editReply({ embeds: [embeds.length ? embeds.at(-1)! : embed] });
			}

			if (closed) {
				return handleMessagePagination(interaction.user.id, message, embeds.length ? embeds : [embed], (action) => {
					this.onExport(action, embeds);
				});
			} else {
				return message.edit({ embeds: [embeds.length ? embeds.at(-1)! : embed] });
			}
		};

		const timeoutId = setInterval(handleChanges, 5000);
		this.client.storage.updateClanLinks(interaction.guildId);

		try {
			const changes = await this.client.rolesManager.updateMany(interaction.guildId, {
				isDryRun: Boolean(args.is_test_run),
				userOrRole: interaction.isButton() ? interaction.user : args.user_or_role ?? null,
				logging: true,
				reason: `manually updated by ${interaction.user.displayName}`
			});

			const roleChanges = this.client.rolesManager.getFilteredChangeLogs(changes);
			if (!roleChanges?.length) {
				embed.setDescription('### No role changes detected!');
				if (!refreshCounter.attempts) embed.setFooter(null);

				if (interaction.isButton()) {
					return interaction.editReply({ embeds: [embed] });
				} else {
					return message.edit({ embeds: [embed], components: [] });
				}
			}

			return await handleChanges(true);
		} finally {
			clearInterval(timeoutId);
			this.client.rolesManager.clearChangeLogs(interaction.guildId);
		}
	}

	private async onExport(interaction: ButtonInteraction<'cached'>, [embed, ...embeds]: EmbedBuilder[]) {
		await interaction.editReply({ embeds: [embed], components: [] });
		for (const embed of embeds) await interaction.followUp({ embeds: [embed], ephemeral: this.muted });
	}
}
