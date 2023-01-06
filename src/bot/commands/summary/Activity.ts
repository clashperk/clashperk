import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { WHITE_NUMBERS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season, Util } from '../../util/index.js';

// TODO: Per season activity
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

		const customIds = {
			action: this.client.uuid(),
			reverse: this.client.uuid()
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Show Most Active Members').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			const reversed = action.customId === customIds.reverse;
			const embed = new EmbedBuilder();
			embed.setAuthor({ name: 'Avg. Activity and Avg. Active Members' });
			const members = await this.aggregationQuery(clans, season!, reversed);
			embed.setDescription(
				[
					`**[${this.i18n('command.lastseen.title_lastseen', { lng: interaction.locale })}](https://clashperk.com/faq)**`,
					`\`\`\`\n\u200eLAST-ON SCORE  NAME\n${members
						.map((m) => `${this.getTime(m.lastSeen!.getTime())}  ${m.score!.toString().padStart(4, ' ')}  ${m.name}`)
						.join('\n')}`,
					'```'
				].join('\n')
			);

			const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
				new ButtonBuilder().setLabel('Reverse Order').setStyle(ButtonStyle.Primary).setCustomId(customIds.reverse)
			);

			await action.update({ embeds: [embed], components: reversed ? [] : [row] });
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
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

	private async aggregationQuery(clans: any[], season: string, reserve: boolean) {
		const db = this.client.db.collection(Collections.LAST_SEEN);
		const result = await db
			.aggregate<{ name: string; tag: string; lastSeen?: Date; score?: number }>([
				{
					$match: {
						'clan.tag': {
							$in: clans.map((c) => c.tag)
						}
					}
				},
				{
					$sort: {
						[`seasons.${season}`]: reserve ? 1 : -1
					}
				},
				{
					$project: {
						tag: '$tag',
						name: '$name',
						lastSeen: '$lastSeen',
						score: `$seasons.${Season.ID}`
					}
				},
				{
					$match: {
						score: {
							$exists: true
						},
						lastSeen: {
							$exists: true
						}
					}
				},
				{
					$limit: 100
				}
			])
			.toArray();

		return result.filter((r) => r.score && r.lastSeen);
	}

	private getTime(ms: number) {
		ms = Date.now() - ms;
		if (!ms) return ''.padEnd(7, ' ');
		return Util.duration(ms + 1e3).padEnd(7, ' ');
	}
}
