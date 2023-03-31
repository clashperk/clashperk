import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

// TODO: Per season activity
export default class SummaryCommand extends Command {
	public constructor() {
		super('summary-activity', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.storage.find('942429939112755240');

		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
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

		collection.sort((a, b) => b.total - a.total);
		const embed = new EmbedBuilder();
		embed.setAuthor({ name: 'Clan Activity Summary', iconURL: interaction.guild.iconURL()! });
		embed.setDescription(
			[
				`\u200e${EMOJIS.HASH}  \`AVG\`  \`SCORE\`  \` ${'CLAN NAME'.padEnd(15, ' ')}\``,
				...collection.map((clan, i) => {
					const online = clan.online.toFixed(0).padStart(3, ' ');
					const total = clan.total.toFixed(0).padStart(5, ' ');
					return `\u200e${BLUE_NUMBERS[i + 1]}  \`${online}\`  \`${total}\`  \` ${clan.name.padEnd(15, ' ')}\``;
				})
			].join('\n')
		);
		embed.setFooter({ text: [`avg = daily average active members`, 'based on the last 30 days of activities'].join('\n') });

		const customIds = { action: this.client.uuid(), reverse: this.client.uuid() };
		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Show Most Active Members').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id
		});

		collector.on('collect', async (action) => {
			await action.deferUpdate();
			const reversed = action.customId === customIds.reverse;
			const embed = new EmbedBuilder();
			embed.setAuthor({ name: `${interaction.guild.name} Most Active Members` });
			const members = await this.aggregationQuery(clans, season!, reversed);
			embed.setDescription(
				[
					`\`\`\`\n\u200eLAST-ON SCORE  NAME\n${members
						.map((m) => `${this.getTime(m.lastSeen!.getTime())}  ${m.score!.toString().padStart(4, ' ')}  ${m.name}`)
						.join('\n')}`,
					'```'
				].join('\n')
			);

			const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
				new ButtonBuilder().setLabel('Reverse Order').setStyle(ButtonStyle.Primary).setCustomId(customIds.reverse)
			);

			await action.editReply({ embeds: [embed], components: reversed ? [] : [row] });
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
					$match: {
						'entries.entry': {
							$gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
						}
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
