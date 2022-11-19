import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
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
		if (!members.length) {
			return interaction.followUp({
				content: this.i18n('command.capital.raids.no_data', { weekId, clan: clan.name, lng: interaction.locale })
			});
		}
		const embed = this.getCapitalRaidEmbed({ clan, weekId, members, locale: interaction.locale });
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async getRaidsFromAPI(clan: Clan) {
		const res = await this.client.http.getRaidSeason(clan);
		if (!res.ok) return [];
		if (!res.items.length) return [];
		const data = res.items[0];
		if (!data?.members?.length) return []; // eslint-disable-line

		const members = data.members.map((m) => ({ ...m, attackLimit: m.attackLimit + m.bonusAttackLimit }));
		clan.memberList.forEach((member) => {
			const attack = members.find((attack) => attack.tag === member.tag);
			if (!attack) {
				members.push({
					name: member.name,
					tag: member.tag,
					capitalResourcesLooted: 0,
					attacks: 0,
					attackLimit: 5,
					bonusAttackLimit: 0
				});
			}
		});

		return members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
	}

	private async aggregateCapitalRaids(clan: Clan, weekId: string) {
		const season = await this.client.db
			.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
			.findOne({ weekId, tag: clan.tag });
		if (!season) return [];
		if (!season.members.length) return [];

		const members = season.members.map((m) => ({ ...m, attackLimit: m.attackLimit + m.bonusAttackLimit }));
		clan.memberList.forEach((member) => {
			const attack = members.find((attack) => attack.tag === member.tag);
			if (!attack) {
				members.push({
					name: member.name,
					tag: member.tag,
					capitalResourcesLooted: 0,
					attacks: 0,
					attackLimit: 5,
					bonusAttackLimit: 0
				});
			}
		});

		return members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
	}

	private getCapitalRaidEmbed({
		clan,
		weekId,
		members,
		locale
	}: {
		clan: Clan;
		weekId: string;
		locale: string;
		members: { name: string; capitalResourcesLooted: number; attacks: number; attackLimit: number }[];
	}) {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: `${clan.name} (${clan.tag})`,
				iconURL: clan.badgeUrls.small
			})
			.setTimestamp()
			.setFooter({ text: `Week of ${weekId}` });

		embed.setDescription(
			[
				`**${this.i18n('command.capital.raids.title', { lng: locale })} (${weekId})**`,
				'```',
				'\u200e # LOOTED ATKS  NAME',
				members
					.map((mem, i) => {
						const looted = this.padding(mem.capitalResourcesLooted);
						const attacks = `${mem.attacks}/${mem.attackLimit}`.padStart(4, ' ');
						return `\u200e${(i + 1).toString().padStart(2, ' ')} ${looted} ${attacks}  ${mem.name}`;
					})
					.join('\n'),
				'```'
			].join('\n')
		);

		return embed;
	}

	private padding(num: number) {
		return num.toString().padStart(6, ' ');
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
