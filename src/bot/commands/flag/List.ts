import { CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';
import { handlePagination } from '../../util/Pagination.js';

export default class FlagListCommand extends Command {
	public constructor() {
		super('flag-list', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			description: {
				content: ['Shows the list of all flagged players.']
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			export: {
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const result = await this.client.db
			.collection(Collections.FLAGS)
			.aggregate<{ name: string; tag: string; user: string; username: string; count: number; reason: string; createdAt: Date }>([
				{
					$match: {
						guild: interaction.guild.id
					}
				},
				{
					$sort: { _id: -1 }
				},
				{
					$group: {
						_id: '$tag',
						reason: {
							$last: '$reason'
						},
						name: {
							$last: '$name'
						},
						tag: {
							$last: '$tag'
						},
						count: {
							$sum: 1
						},
						user: {
							$last: '$user'
						},
						username: {
							$last: '$username'
						},
						createdAt: {
							$last: '$createdAt'
						}
					}
				}
			])
			.toArray();

		const embeds: EmbedBuilder[] = [];

		Util.chunk(result, 15).forEach((chunk) => {
			const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
			embed.setTitle('Flags');
			chunk.map((mem) =>
				embed.addFields({
					name: '\u200b',
					value: [
						`\u200e[${escapeMarkdown(mem.name)} (${mem.tag})](${this.client.http.getPlayerURL(mem.tag)})`,
						`*Latest reason:* ${escapeMarkdown(mem.reason.substring(0, 256))}${mem.reason.length > 256 ? '...' : ''}`,
						'',
						`*Flagged by:* ${mem.username} ${time(mem.createdAt, 'R')}`
					].join('\n')
				})
			);
			embed.setFooter({ text: `Total ${result.length}` });
			embeds.push(embed);
		});

		return handlePagination(interaction, embeds);
	}
}
