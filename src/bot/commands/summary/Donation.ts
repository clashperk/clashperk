import { EmbedBuilder, CommandInteraction } from 'discord.js';
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
		super('donation-summary', {
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

		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild.id }).toArray();
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
						},
						members: {
							$addToSet: {
								tag: '$tag',
								name: '$name',
								clanTag: '$clanTag',
								donations: '$donations',
								donationsReceived: '$donationsReceived'
							}
						}
					}
				}
			])
			.toArray();
		if (!aggregated.length) {
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}

		aggregated.sort((a, b) => b.donations - a.donations);
		const members = aggregated
			.map((ag) => ag.members)
			.flat()
			.map((en) => ({
				name: en.name,
				clanTag: en.clanTag,
				donated: en.donations,
				received: en.donationsReceived,
				clanIndex: aggregated.findIndex((clan) => clan.tag === en.clanTag) + 1
			}))
			.sort((a, b) => b.donated - a.donated)
			.slice(0, 15);

		const [mem_dp, mem_rp] = [
			this.predict(Math.max(...members.map((m) => m.donated))),
			this.predict(Math.max(...members.map((m) => m.received)))
		];
		const [clan_dp, clan_rp] = [
			this.predict(Math.max(...aggregated.map((m) => m.donations))),
			this.predict(Math.max(...aggregated.map((m) => m.donationsReceived)))
		];

		embed.setDescription(
			[
				'**Top Clans**',
				`${EMOJIS.HASH} \`\u200e${'DON'.padStart(clan_dp, ' ')} ${'REC'.padStart(clan_rp, ' ')}  ${'CLAN'.padEnd(15, ' ')}\u200f\``,
				Util.splitMessage(
					aggregated
						.map(
							(clan, n) =>
								`${BLUE_NUMBERS[++n]} \`\u200e${this.donation(clan.donations, clan_dp)} ${this.donation(
									clan.donationsReceived,
									clan_rp
								)}  ${clan.name.padEnd(15, ' ')}\u200f\``
						)
						.join('\n'),
					{ maxLength: 4000 }
				)[0]
			].join('\n')
		);

		const embeds = [
			embed,
			new EmbedBuilder()
				.setColor(this.client.embed(interaction))
				.setDescription(
					[
						'**Top Players**',
						`${EMOJIS.CLAN} \u200e\`${'DON'.padStart(mem_dp, ' ')} ${'REC'.padStart(mem_rp, ' ')}  ${'PLAYER'.padEnd(
							15,
							' '
						)}\u200f\``,
						Util.splitMessage(
							members
								.map(
									(mem) =>
										`${BLUE_NUMBERS[mem.clanIndex]} \`\u200e${this.donation(mem.donated, mem_dp)} ${this.donation(
											mem.received,
											mem_rp
										)}  ${mem.name.padEnd(15, ' ')}\u200f\``
								)
								.join('\n'),
							{ maxLength: 2000 }
						)[0]
					].join('\n')
				)
				.setFooter({ text: `Season ${season}` })
		];

		return interaction.editReply({ embeds });
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private predict(num: number) {
		return num > 999999 ? 7 : num > 99999 ? 6 : 5;
	}
}
