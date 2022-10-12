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

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId }))
			)
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel('Preserve')
					.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId, clear: true }))
			);

		const isRaidWeek = currentWeekId === weekId;
		const members = isRaidWeek ? await this.getRaidsFromAPI(clan) : await this.aggregateCapitalRaids(clan, weekId);
		const embed = this.getCapitalRaidEmbed({ clan, weekId, members, isRaidWeek });
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async getRaidsFromAPI(clan: Clan) {
		const data = await this.client.http.getRaidSeason(clan);
		const members = data.members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);

		return members.map((mem) => ({
			name: mem.name,
			capitalResourcesLooted: mem.capitalResourcesLooted,
			attacks: mem.attacks,
			attackLimit: mem.attackLimit + mem.bonusAttackLimit
		}));
	}

	private async aggregateCapitalRaids(clan: Clan, weekId: string) {
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

		const members: { name: string; capitalResourcesLooted: number; attacks: number; attackLimit: number }[] = [];
		clan.memberList.forEach((member) => {
			const attack = attacks.find((attack) => attack.tag === member.tag);
			if (attack) members.push({ name: member.name, capitalResourcesLooted: attack.total, attacks: 0, attackLimit: 0 });
			else members.push({ name: member.name, capitalResourcesLooted: 0, attacks: 0, attackLimit: 0 });
		});

		return members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
	}

	private getCapitalRaidEmbed({
		clan,
		weekId,
		members,
		isRaidWeek
	}: {
		clan: Clan;
		weekId: string;
		isRaidWeek: boolean;
		members: { name: string; capitalResourcesLooted: number; attacks: number; attackLimit: number }[];
	}) {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: `${clan.name} (${clan.tag})`,
				iconURL: clan.badgeUrls.small
			})
			.setFooter({ text: `Week of ${weekId}` });

		embed.setDescription(
			[
				`**Clan Capital Raids (${weekId})**`,
				'```',
				'\u200eTotal  Name',
				members.map((mem) => `\u200e${this.padding(mem.capitalResourcesLooted)}  ${mem.name}`).join('\n'),
				'```'
			].join('\n')
		);

		if (isRaidWeek) {
			embed.setDescription(
				[
					`**Clan Capital Raids (${weekId})**`,
					'```',
					'\u200eLOOTED ATKS  NAME',
					members
						.map((mem) => {
							const looted = this.padding(mem.capitalResourcesLooted);
							const attacks = `${mem.attacks}/${mem.attackLimit}`.padStart(4, ' ');
							return `\u200e${looted}  ${attacks}  ${mem.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);
		}

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
