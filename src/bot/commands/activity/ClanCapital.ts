import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { ClanCapitalGoldModel, ClanCapitalRaidsModel } from '../../types/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class ClanCapital extends Command {
	public constructor() {
		super('clan-capital', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		const { weekId, weekDate } = this.raidWeek();

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

		const contributions = await this.client.db
			.collection(Collections.CAPITAL_CONTRIBUTIONS)
			.aggregate<ClanCapitalGoldModel & { total: number }>([
				{
					$match: { 'clan.tag': clan.tag, 'tag': { $in: clan.memberList.map((clan) => clan.tag) } }
				},
				{
					$match: {
						createdAt: {
							$gt: new Date(weekDate)
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

		const customIds = {
			raid: this.client.uuid(interaction.user.id),
			contributions: this.client.uuid(interaction.user.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setLabel('Raids')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.CAPITAL_RAID)
					.setCustomId(customIds.raid)
			)
			.addComponents(
				new ButtonBuilder()
					.setLabel('Contributions')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.CAPITAL_GOLD)
					.setCustomId(customIds.contributions)
					.setDisabled(true)
			);

		const members: { name: string; raids: number }[] = [];
		clan.memberList.forEach((member) => {
			const attack = attacks.find((attack) => attack.tag === member.tag);
			if (attack) members.push({ name: member.name, raids: attack.total });
			else members.push({ name: member.name, raids: 0 });
		});

		const embed = this.getCapitalContributionsEmbed({ clan, weekId, contributions });
		const msg = await interaction.editReply({ embeds: [embed], components: [row] });

		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.raid) {
				row.components[0].setDisabled(true);
				row.components[1].setDisabled(false);
				const embed = this.getCapitalRaidEmbed({ clan, weekId, attacks });
				await action.update({ embeds: [embed], components: [row] });
			}
			if (action.customId === customIds.contributions) {
				row.components[1].setDisabled(true);
				row.components[0].setDisabled(false);
				const embed = this.getCapitalContributionsEmbed({ clan, weekId, contributions });
				await action.update({ embeds: [embed], components: [row] });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
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
}
