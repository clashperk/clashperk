import { AutocompleteInteraction, CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import { ObjectId } from 'mongodb';
import { cluster } from 'radash';
import { FlagsEntity } from '../../entities/flags.js';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
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

	public autocomplete(interaction: AutocompleteInteraction<'cached'>, args: { player_tag?: string }) {
		return this.client.autocomplete.flagSearchAutoComplete(interaction, args);
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { flag_type: 'strike' | 'ban'; player_tag?: string }) {
		if (args.player_tag) return this.filterByPlayerTag(interaction, args);

		const result = await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.aggregate<FlagsEntity>([
				{
					$match: {
						guild: interaction.guild.id,
						flagType: args.flag_type,
						$or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
					}
				},
				{
					$sort: { _id: -1 }
				}
			])
			.toArray();

		// Delete expired flags.
		await this.deleteExpiredFlags(interaction.guildId);

		if (!result.length) {
			return interaction.editReply(`No Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`);
		}

		const embeds: EmbedBuilder[] = [];

		cluster(result, 15).forEach((chunk) => {
			const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
			embed.setTitle(`Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`);
			chunk.forEach((mem) => {
				const reason = `Reason: ${escapeMarkdown(mem.reason.substring(0, 256))}${mem.reason.length > 256 ? '...' : ''}`;
				embed.addFields({
					name: '\u200b',
					value: [
						`\u200e[${escapeMarkdown(mem.name)} (${mem.tag})](http://cprk.eu/p/${mem.tag.replace('#', '')})`,
						`Created ${time(mem.createdAt, 'R')}, by ${mem.username}${mem.expiresAt ? `` : ''}`,
						mem.expiresAt ? `Expires on ${time(mem.expiresAt, 'd')}\n${reason}` : `${reason}`
					].join('\n')
				});
			});
			embed.setFooter({ text: `Total ${result.length}` });
			embeds.push(embed);
		});

		return handlePagination(interaction, embeds);
	}

	private async filterByPlayerTag(interaction: CommandInteraction<'cached'>, args: { player_tag?: string; flag_type: 'ban' | 'strike' }) {
		const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
		if (!player) return;

		const flag = await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.aggregate<{
				name: string;
				tag: string;
				user: string;
				createdAt: Date;
				count: number;
				flagImpact: number;
				flags: { reason: string; userId: string; createdAt: Date; _id: ObjectId }[];
			}>([
				{
					$match: {
						guild: interaction.guild.id,
						tag: player.tag,
						flagType: args.flag_type
					}
				},
				{
					$sort: { _id: -1 }
				},
				{
					$group: {
						_id: '$tag',
						flags: {
							$push: {
								_id: '$_id',
								reason: '$reason',
								userId: '$user',
								flagType: '$flagType',
								createdAt: '$createdAt'
							}
						},
						name: { $last: '$name' },
						tag: { $last: '$tag' },
						user: { $last: '$user' },
						createdAt: { $last: '$createdAt' },
						count: { $sum: 1 },
						flagImpact: { $sum: '$flagImpact' }
					}
				}
			])
			.next();

		if (!flag) {
			return interaction.editReply(this.i18n('command.flag.search.not_found', { lng: interaction.locale, tag: player.tag }));
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(`Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`)
			.setDescription(
				[
					`[${player.name} (${player.tag})](http://cprk.eu/p/${player.tag.replace('#', '')})`,
					`Flagged by <@${flag.user}> ${args.flag_type === 'strike' ? `\n\n**Flag Weight ${flag.flagImpact}**` : ''}`,
					'',
					`**Flags (${flag.count})**`,
					flag.flags
						.map(
							({ createdAt, reason, _id }) =>
								`- ${time(createdAt, 'd')} - \`${_id.toHexString().substr(-5).toUpperCase()}\` \n- ${reason}`
						)
						.join('\n\n')
				].join('\n')
			);

		return interaction.editReply({ embeds: [embed] });
	}

	private async deleteExpiredFlags(guildId: string) {
		await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.deleteMany({ guild: guildId, $and: [{ expiresAt: { $lt: new Date() } }] });
	}
}
