import { CommandInteraction, EmbedBuilder } from 'discord.js';
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
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { is_dry_run?: boolean }) {
		const inProgress = this.client.rolesManager.getChangeLogs(interaction.guildId);
		if (inProgress) {
			return interaction.editReply('Role refresh is currently being processed.');
		}

		if (this.client.rpcHandler.isInMaintenance) {
			return interaction.editReply('Command is blocked due to ongoing maintenance break.');
		}

		const startTime = Date.now();
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(`### Refreshing Server Roles ${EMOJIS.LOADING}`)
			.setFooter({ text: `Progress: -/- (0%)${args.is_dry_run ? ' [DryRun]' : ''}` });
		const message = await interaction.editReply({ embeds: [embed] });

		const handleChanges = async (closed = false) => {
			const changes = this.client.rolesManager.getChangeLogs(interaction.guildId);
			if (!changes) return null;

			if (closed) embed.setDescription('### Roles Refreshed Successfully');
			const percentage = ((changes.progress / changes.memberCount) * 100).toFixed(2);
			embed.setFooter({
				text: [
					`Time Elapsed: ${moment.duration(Date.now() - startTime).format('h[h] m[m] s[s]', { trim: 'both mid' })}`,
					`Progress: ${changes.progress}/${changes.memberCount} (${percentage}%)${args.is_dry_run ? ' [DryRun]' : ''}`
				].join('\n')
			});

			const roleChanges = this.client.rolesManager.getFilteredChangeLogs(changes);
			const embeds: EmbedBuilder[] = [];

			cluster(roleChanges, 15).forEach((changes) => {
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

			if (closed) {
				return handleMessagePagination(interaction.user.id, message, embeds.length ? embeds : [embed]);
			} else {
				return message.edit({ embeds: [embeds.length ? embeds.at(-1)! : embed] });
			}
		};

		const timeoutId = setInterval(handleChanges, 5000);

		try {
			const changes = await this.client.rolesManager.updateMany(interaction.guildId, {
				isDryRun: Boolean(args.is_dry_run),
				logging: true,
				reason: `manually updated by ${interaction.user.displayName}`
			});

			const roleChanges = this.client.rolesManager.getFilteredChangeLogs(changes);
			if (!roleChanges?.length) {
				return message.edit({ embeds: [embed.setDescription('### No role changes detected!')], components: [] });
			}

			return await handleChanges(true);
		} finally {
			clearInterval(timeoutId);
			this.client.rolesManager.clearChangeLogs(interaction.guildId);
		}
	}
}
