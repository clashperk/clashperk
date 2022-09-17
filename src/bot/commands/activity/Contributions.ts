import { Clan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { ClanCapitalGoldModel } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class CapitalContributionsCommand extends Command {
	public constructor() {
		super('capital-contributions', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; week?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const weekId = args.week ?? this.raidWeek().weekId;
		const startWeek = moment(weekId).utc(true).add(7, 'h').utc().toDate();
		const endWeek = moment(weekId).utc(true).add(7, 'd').add(7, 'h').toDate();

		const contributions = await this.client.db
			.collection(Collections.CAPITAL_CONTRIBUTIONS)
			.aggregate<ClanCapitalGoldModel & { total: number }>([
				{
					$match: { 'clan.tag': clan.tag, 'tag': { $in: clan.memberList.map((clan) => clan.tag) } }
				},
				{
					$match: {
						createdAt: {
							$gt: startWeek,
							$lt: endWeek
						}
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
					$sort: {
						total: -1
					}
				}
			])
			.toArray();

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag }))
			)
			.addComponents(
				new ButtonBuilder()
					.setLabel('Raids')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.CAPITAL_RAID)
					.setCustomId(JSON.stringify({ cmd: 'capital-raids', tag: clan.tag }))
					.setDisabled(true)
			);

		const embed = this.getCapitalContributionsEmbed({ clan, weekId, contributions });
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private getCapitalContributionsEmbed({
		clan,
		weekId,
		contributions
	}: {
		clan: Clan;
		weekId: string;
		contributions: (ClanCapitalGoldModel & { total: number })[];
	}) {
		const members: { name: string; raids: number }[] = [];
		clan.memberList.forEach((member) => {
			const attack = contributions.find((attack) => attack.tag === member.tag);
			if (attack) members.push({ name: member.name, raids: attack.total });
			else members.push({ name: member.name, raids: 0 });
		});

		members.sort((a, b) => b.raids - a.raids);
		const embed = new EmbedBuilder()
			.setAuthor({
				name: `${clan.name} (${clan.tag})`,
				iconURL: clan.badgeUrls.small
			})
			.setDescription(
				[
					`**Clan Capital Gold Contributions (${weekId})**`,
					'```',
					'\u200eTotal  Name',
					members.map((mem) => `\u200e${this.padding(mem.raids)}  ${mem.name}`).join('\n'),
					'```'
				].join('\n')
			)
			.setFooter({ text: `Week of ${weekId}` });

		return embed;
	}

	private padding(num: number) {
		return num.toString().padEnd(5, ' ');
	}

	private raidWeek() {
		const today = new Date();
		const weekDay = today.getUTCDay();
		const hours = today.getUTCHours();
		const isRaidWeek = (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
		today.setUTCDate(today.getUTCDate() - today.getUTCDay());
		if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
		today.setUTCDate(today.getUTCDate() + 5);
		today.setUTCMinutes(0, 0, 0);
		return { weekDate: today, weekId: today.toISOString().substring(0, 10), isRaidWeek };
	}

	private getWeekIds() {
		const weekIds = [];
		const friday = moment().endOf('month').day('Friday');
		if (friday.date() > 7) friday.subtract(7, 'd');
		while (weekIds.length < 5) {
			if (friday.toDate().getTime() < Date.now()) {
				weekIds.push(friday.format('YYYY-MM-DD'));
			}
			friday.subtract(7, 'd');
		}

		return weekIds;
	}
}
