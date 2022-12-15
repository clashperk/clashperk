import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { WHITE_NUMBERS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

export default class FamilyCommand extends Command {
	public constructor() {
		super('family-activity', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.db
			.collection<{ name: string; tag: string }>(Collections.CLAN_STORES)
			.find({ guild: interaction.guild.id })
			.toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const collection: { online: number; total: number; name: string; tag: string }[] = [];
		for (const clan of clans) {
			const action = await this.getActivity(clan.tag);

			collection.push({
				online: action?.avg_online ?? 0,
				total: action?.avg_total ?? 0,
				name: clan.name,
				tag: clan.tag
			});

			if (!action) continue;
		}

		const embed = new EmbedBuilder();
		embed.setAuthor({ name: 'Avg. Activity and Avg. Active Members' });
		embed.setDescription(
			collection
				.map(
					(clan, i) =>
						`${WHITE_NUMBERS[i + 1]} \`${clan.name.padEnd(15, ' ')}\` \`${clan.online
							.toFixed(0)
							.padStart(3, ' ')}\` \`${clan.total.toFixed(0).padStart(4, ' ')}\``
				)
				.join('\n')
		);

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setLabel('Show Recently Active Members')
				.setStyle(ButtonStyle.Primary)
				.setCustomId(this.client.uuid())
				.setDisabled(true)
		);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async getActivity(tag: string): Promise<{ avg_total: number; avg_online: number } | null> {
		return this.client.db
			.collection(Collections.LAST_SEEN)
			.aggregate<{ avg_total: number; avg_online: number }>([
				{
					$match: {
						'clan.tag': tag
					}
				},
				{
					$sort: {
						lastSeen: -1
					}
				},
				{
					$limit: 50
				},
				{
					$unwind: {
						path: '$entries'
					}
				},
				{
					$group: {
						_id: {
							date: {
								$dateToString: {
									date: '$entries.entry',
									format: '%Y-%m-%d'
								}
							},
							tag: '$tag'
						},
						count: {
							$sum: '$entries.count'
						}
					}
				},
				{
					$group: {
						_id: '$_id.date',
						online: {
							$sum: 1
						},
						total: {
							$sum: '$count'
						}
					}
				},
				{
					$group: {
						_id: null,
						avg_online: {
							$avg: '$online'
						},
						avg_total: {
							$avg: '$total'
						}
					}
				}
			])
			.next();
	}
}
