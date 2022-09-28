import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { ClanCapitalRaidsModel } from '../../types/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class CapitalRaidsCommand extends Command {
	public constructor() {
		super('capital-raids', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; week?: string; clear?: boolean }) {
		if (args.clear) {
			return interaction.editReply({ components: [] });
		}

		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const currentWeekId = this.raidWeek().weekId;
		const weekId = args.week ?? currentWeekId;

		const attacks = await this.client.db
			.collection(Collections.RAID_ATTACKS)
			.aggregate<ClanCapitalRaidsModel & { total: number }>([
				{
					$match: { weekId, tag: { $in: clan.memberList.map((clan) => clan.tag) } }
				},
				{
					$addFields: {
						total: {
							$sum: '$clans.collected'
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

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(EMOJIS.REFRESH)
				.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId }))
		);

		const embed = this.getCapitalRaidEmbed({ clan, weekId, attacks });
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private getCapitalRaidEmbed({
		clan,
		weekId,
		attacks
	}: {
		clan: Clan;
		weekId: string;
		attacks: (ClanCapitalRaidsModel & { total: number })[];
	}) {
		const members: { name: string; raids: number }[] = [];
		clan.memberList.forEach((member) => {
			const attack = attacks.find((attack) => attack.tag === member.tag);
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
					`**Clan Capital Raids (${weekId})**`,
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
}
