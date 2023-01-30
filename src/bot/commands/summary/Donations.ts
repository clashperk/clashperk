import { EmbedBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';
import { Command } from '../../lib/index.js';

export interface Aggregated {
	tag: string;
	name: string;
	donations: number;
	donationsReceived: number;
	members: {
		tag: string;
		name: string;
		clanTag: string;
		donations: number;
		donationsReceived: number;
	}[];
}

export default class DonationSummaryCommand extends Command {
	public constructor() {
		super('family-donations', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Top Donations`, iconURL: interaction.guild.iconURL({ forceStatic: false })! });

		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const fetched: Clan[] = (await Promise.all(clans.map((en) => this.client.http.clan(en.tag)))).filter((res) => res.ok);
		if (!fetched.length) {
			return interaction.editReply(this.i18n('common.fetch_failed', { lng: interaction.locale }));
		}

		const aggregated = await this.client.db
			.collection(Collections.PLAYER_SEASONS)
			.aggregate<Aggregated>([
				{
					$match: {
						season,
						$or: fetched.map((clan) => clan.memberList.map((mem) => ({ __clans: clan.tag, tag: mem.tag }))).flat()
					}
				},
				{
					$project: {
						clans: {
							$objectToArray: '$clans'
						},
						name: 1,
						tag: 1
					}
				},
				{
					$unwind: {
						path: '$clans'
					}
				},
				{
					$project: {
						name: 1,
						tag: 1,
						clanTag: '$clans.v.tag',
						clanName: '$clans.v.name',
						donations: '$clans.v.donations.total',
						donationsReceived: '$clans.v.donationsReceived.total'
					}
				},
				{
					$match: {
						clanTag: {
							$in: fetched.map((clan) => clan.tag)
						}
					}
				},
				{
					$group: {
						_id: '$clanTag',
						donations: {
							$sum: '$donations'
						},
						donationsReceived: {
							$sum: '$donationsReceived'
						},
						name: {
							$first: '$clanName'
						},
						tag: {
							$first: '$clanTag'
						}
					}
				}
			])
			.toArray();
		if (!aggregated.length) {
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}

		aggregated.sort((a, b) => b.donations - a.donations);
		const [clanDp, clanRp] = [
			this.predict(Math.max(...aggregated.map((m) => m.donations))),
			this.predict(Math.max(...aggregated.map((m) => m.donationsReceived)))
		];

		embed.setDescription(
			[
				'**Top Clans**',
				`${EMOJIS.HASH} \`\u200e${'DON'.padStart(clanDp, ' ')} ${'REC'.padStart(clanRp, ' ')}  ${'CLAN'.padEnd(15, ' ')}\u200f\``,
				Util.splitMessage(
					aggregated
						.map(
							(clan, n) =>
								`${BLUE_NUMBERS[++n]} \`\u200e${this.donation(clan.donations, clanDp)} ${this.donation(
									clan.donationsReceived,
									clanRp
								)}  ${clan.name.padEnd(15, ' ')}\u200f\``
						)
						.join('\n'),
					{ maxLength: 4000 }
				)[0]
			].join('\n')
		);

		const customIds = {
			action: this.client.uuid(),
			reverse: this.client.uuid(),
			inverse: this.client.uuid()
		};
		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Show Top Donating Players').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);
		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.action) {
				await action.deferUpdate();
				const embed = await this.playerDonations(interaction, clans, season!);
				const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
					new ButtonBuilder().setLabel('Sort by Received').setStyle(ButtonStyle.Primary).setCustomId(customIds.reverse)
				);
				await action.editReply({ embeds: [embed], components: [row] });
			}
			if (action.customId === customIds.reverse) {
				await action.deferUpdate();
				const embed = await this.playerDonations(interaction, clans, season!, true);
				await action.editReply({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private predict(num: number) {
		return num > 999999 ? 7 : num > 99999 ? 6 : 5;
	}

	private async playerDonations(interaction: CommandInteraction<'cached'>, clans: any[], seasonId: string, reverse = false) {
		const orders = reverse
			? [{ $sort: { donations: -1 } }, { $sort: { receives: -1 } }]
			: [{ $sort: { receives: -1 } }, { $sort: { donations: -1 } }];
		const members = await this.client.db
			.collection(Collections.PLAYER_SEASONS)
			.aggregate<{ name: string; tag: string; donations: number; receives: number }>([
				{
					$match: {
						__clans: { $in: clans.map((clan) => clan.tag) },
						season: seasonId
					}
				},
				{
					$project: {
						clans: {
							$objectToArray: '$clans'
						},
						name: 1,
						tag: 1
					}
				},
				{
					$unwind: {
						path: '$clans'
					}
				},
				{
					$project: {
						name: 1,
						tag: 1,
						clanTag: '$clans.v.tag',
						clanName: '$clans.v.name',
						donations: '$clans.v.donations.total',
						donationsReceived: '$clans.v.donationsReceived.total'
					}
				},
				{
					$match: {
						clanTag: {
							$in: clans.map((clan) => clan.tag)
						}
					}
				},
				{
					$group: {
						_id: '$tag',
						name: {
							$first: '$name'
						},
						tag: {
							$first: '$tag'
						},
						donations: {
							$sum: '$donations'
						},
						receives: {
							$sum: '$donationsReceived'
						}
					}
				},
				...orders,
				{
					$limit: 100
				}
			])
			.toArray();
		const [memDp, memRp] = [
			this.predict(Math.max(...members.map((m) => m.donations))),
			this.predict(Math.max(...members.map((m) => m.receives)))
		];
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(
				[
					'**Top Players**',
					`${EMOJIS.HASH} \u200e\`${'DON'.padStart(memDp, ' ')} ${'REC'.padStart(memRp, ' ')}  ${'PLAYER'.padEnd(
						15,
						' '
					)}\u200f\``,
					Util.splitMessage(
						members
							.map(
								(mem, i) =>
									`${BLUE_NUMBERS[i + 1]} \`\u200e${this.donation(mem.donations, memDp)} ${this.donation(
										mem.receives,
										memRp
									)}  ${mem.name.padEnd(15, ' ')}\u200f\``
							)
							.join('\n'),
						{ maxLength: 4000 }
					)[0]
				].join('\n')
			)
			.setFooter({ text: `Season ${seasonId}` });
		return embed;
	}
}
