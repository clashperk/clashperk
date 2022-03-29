import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis';
import { MessageEmbed, CommandInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Season, Util } from '../../util';
import { Command } from '../../lib';
import { Clan } from 'clashofclans.js';

export default class PlayerDonationSummaryCommand extends Command {
	public constructor() {
		super('player-donation-summary', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season }: { season?: string }) {
		if (!season) season = Season.ID;

		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild.id }).toArray();
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const fetched: Clan[] = (await Promise.all(clans.map((en) => this.client.http.clan(en.tag)))).filter((res) => res.ok);
		if (!fetched.length) {
			return interaction.editReply("**Something went wrong. I couldn't fetch all clans!**");
		}

		const players = await this.globalDonations(clans, season);
		// players.sort((a, b) => b.receives - a.receives).sort((a, b) => b.donations - a.donations);
		const [mem_dp, mem_rp] = [
			this.predict(Math.max(...players.map((m) => m.donations))),
			this.predict(Math.max(...players.map((m) => m.receives)))
		];

		const getEmbed = () => {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(interaction))
				.setAuthor({ name: 'Top Players among Clan Family' })
				.setDescription(
					[
						Util.splitMessage(
							[
								`${EMOJIS.HASH} \u200e\`${'DON'.padStart(mem_dp, ' ')} ${'REC'.padStart(mem_rp, ' ')}  ${'PLAYER'.padEnd(
									15,
									' '
								)}\u200f\``,
								players
									.map(
										(mem, i) =>
											`${BLUE_NUMBERS[++i]} \`\u200e${this.donation(mem.donations, mem_dp)} ${this.donation(
												mem.receives,
												mem_rp
											)}  ${mem.name.padEnd(15, ' ')}\u200f\``
									)
									.join('\n')
							].join('\n'),
							{ maxLength: 4000 }
						)[0]
					].join('\n')
				)
				.setFooter({ text: `Season ${season!}` });

			return embed;
		};

		const embed = getEmbed();
		const customId = this.client.uuid(interaction.user.id);
		const row = new MessageActionRow().addComponents(
			new MessageButton().setStyle('SECONDARY').setCustomId(customId).setLabel('Sort by Received')
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customId && action.user.id === interaction.user.id,
			max: 1,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customId) {
				players.sort((a, b) => b.receives - a.receives);
				const embed = getEmbed();
				return action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customId);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private predict(num: number) {
		return num > 999999 ? 7 : num > 99999 ? 6 : 5;
	}

	private async globalDonations(clans: any[], seasonId: string) {
		return this.client.db
			.collection(Collections.CLAN_MEMBERS)
			.aggregate<{ name: string; tag: string; donations: number; receives: number }>([
				{
					$match: {
						clanTag: { $in: clans.map((clan) => clan.tag) },
						season: seasonId
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
							$sum: '$donations.gained'
						},
						receives: {
							$sum: '$donationsReceived.gained'
						}
					}
				},
				{
					$sort: {
						receives: -1
					}
				},
				{
					$sort: {
						donations: -1
					}
				},
				{
					$limit: 100
				}
			])
			.toArray();
	}
}
