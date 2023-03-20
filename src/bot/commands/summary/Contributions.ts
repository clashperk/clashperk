import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';

export default class SummaryCapitalContributionCommand extends Command {
	public constructor() {
		super('summary-capital-contribution', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season, week }: { season?: string; week?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.storage.find(interaction.guild.id);

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const startWeek = moment(week).utc(true).add(7, 'h').utc().toDate();
		const endWeek = moment(week).utc(true).add(7, 'd').add(7, 'h').toDate();

		const result = await this.client.db
			.collection(Collections.CAPITAL_CONTRIBUTIONS)
			.aggregate<{ clans: { name: string; tag: string; total: number }[]; members: { name: string; tag: string; total: number }[] }>([
				{
					$match: {
						...(week ? { createdAt: { $gt: startWeek, $lt: endWeek } } : { season: season }),
						'clan.tag': { $in: clans.map((clan) => clan.tag) }
					}
				},
				{
					$addFields: {
						total: {
							$subtract: ['$current', '$initial']
						}
					}
				},
				{
					$facet: {
						clans: [
							{
								$group: {
									_id: '$clan.tag',
									total: { $sum: '$total' },
									name: { $first: '$clan.name' },
									tag: { $first: '$clan.tag' }
								}
							},
							{
								$sort: {
									total: -1
								}
							}
						],
						members: [
							{
								$group: {
									_id: '$tag',
									name: { $first: '$name' },
									tag: { $first: 'tag' },
									total: { $sum: '$total' }
								}
							},
							{
								$project: {
									name: 1,
									tag: 1,
									total: 1
								}
							},
							{
								$sort: {
									total: -1
								}
							},
							{
								$limit: 99
							}
						]
					}
				}
			])
			.next();

		const clansGroup = result?.clans ?? [];
		const membersGroup = result?.members ?? [];
		const maxPad = Math.max(...clansGroup.map((clan) => clan.total.toString().length));

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setAuthor({ name: `${interaction.guild.name} Capital Contributions` });
		embed.setDescription(
			[
				'```',
				`\u200e #  ${'TOTAL'.padStart(maxPad, ' ')}  NAME`,
				clansGroup
					.map(
						(clan, i) => `${(i + 1).toString().padStart(2, ' ')}  ${clan.total.toString().padStart(maxPad, ' ')}  ${clan.name}`
					)
					.join('\n'),
				'```'
			].join('\n')
		);

		if (week) {
			embed.setFooter({ text: `Week ${Util.dateRangeFormat(startWeek, endWeek)}` });
		} else {
			embed.setFooter({ text: `Season ${season}` });
		}

		const customIds = {
			action: this.client.uuid(),
			active: this.client.uuid()
		};
		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Show Top Contributors').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.action) {
				const embed = new EmbedBuilder()
					.setColor(this.client.embed(interaction))
					.setAuthor({ name: `${interaction.guild.name} Top Contributors` })
					.setDescription(
						[
							`**${this.i18n('command.capital.contribution.title', { lng: interaction.locale })} (${season!})**`,
							'```',
							'\u200e #  TOTAL  NAME',
							membersGroup
								.map((mem, i) => `\u200e${(i + 1).toString().padStart(2, ' ')}  ${this.padding(mem.total)}  ${mem.name}`)
								.join('\n'),
							'```'
						].join('\n')
					);

				if (week) {
					embed.setFooter({ text: `Week ${Util.dateRangeFormat(startWeek, endWeek)}` });
				} else {
					embed.setFooter({ text: `Season ${season!}` });
				}

				await action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private padding(num: number) {
		return num.toString().padStart(5, ' ');
	}
}
