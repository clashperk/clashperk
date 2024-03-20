import { APICapitalRaidSeason, APIClan } from 'clashofclans.js';
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	StringSelectMenuBuilder,
	User
} from 'discord.js';
import moment from 'moment';
import fetch from 'node-fetch';
import { Args, Command } from '../../lib/index.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

export default class CapitalRaidsCommand extends Command {
	public constructor() {
		super('capital-raids', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public args(): Args {
		return {
			clan_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	private async rankings(tag: string) {
		const ranks = await this.client.db
			.collection(Collections.CAPITAL_RANKS)
			.aggregate<{ country: string; countryCode: string; clans: { rank: number } }>([
				{
					$match: {
						season: Season.ID
					}
				},
				{
					$unwind: {
						path: '$clans'
					}
				},
				{
					$match: {
						'clans.tag': tag
					}
				}
			])
			.toArray();

		return {
			globalRank: ranks.find(({ countryCode }) => countryCode === 'global')?.clans.rank ?? null,
			countryRank: ranks.find(({ countryCode }) => countryCode !== 'global') ?? null
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; week?: string; card?: boolean; user?: User; player_tag?: string }
	) {
		if (args.user || args.player_tag) {
			return interaction.editReply(`This command option has been replaced with the ${this.client.commands.get('/history')} command.`);
		}

		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const currentWeekId = this.raidWeek().weekId;
		const weekId = args.week ?? currentWeekId;

		const { res, body: raid } = await this.client.http.getRaidSeasons(clan.tag, 6);
		if (!res.ok || !raid.items.length) {
			return interaction.followUp({
				ephemeral: this.muted,
				content: `Raid weekend info isn't available for ${clan.name} (${clan.tag})`
			});
		}
		const data = raid.items.find((item) => moment(item.startTime).format('YYYY-MM-DD') === weekId);

		if (args.card) {
			const season = await this.client.db
				.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
				.findOne({ weekId, tag: clan.tag });

			if (!data) {
				return interaction.followUp({
					ephemeral: this.muted,
					content: `Raid weekend info isn't available for ${clan.name} (${clan.tag})`
				});
			}

			const offensiveReward = this.client.http.calcRaidMedals(data);
			const raidsCompleted = this.client.http.calcRaidCompleted(data.attackLog);

			const hasTrophyCard = Boolean(
				season?.clanCapitalPoints && season._clanCapitalPoints && season._clanCapitalPoints !== season.clanCapitalPoints
			);

			const query = new URLSearchParams({
				clanName: clan.name,
				clanBadgeUrl: clan.badgeUrls.large,
				startDate: moment(data.startTime).toDate().toUTCString(),
				endDate: moment(data.endTime).toDate().toUTCString(),
				offensiveReward: offensiveReward.toString(),
				defensiveReward: data.defensiveReward.toString(),
				totalLoot: data.capitalTotalLoot.toString(),
				totalAttacks: data.totalAttacks.toString(),
				enemyDistrictsDestroyed: data.enemyDistrictsDestroyed.toString(),
				raidsCompleted: raidsCompleted.toString()
			});

			await interaction.followUp({
				files: [
					new AttachmentBuilder(`${process.env.ASSET_API_BACKEND!}/capital/raid-medals-card?${query.toString()}`, {
						name: 'capital-raid-weekend-card.jpeg'
					})
				]
			});

			if (hasTrophyCard && season) {
				const { globalRank, countryRank } = await this.rankings(clan.tag);
				const type =
					season._capitalLeague!.id > season.capitalLeague!.id
						? 'Promoted'
						: season._capitalLeague!.id === season.capitalLeague!.id
						? 'Stayed'
						: 'Demoted';
				const trophiesEarned = season._clanCapitalPoints! - season.clanCapitalPoints!;

				query.set('type', type);
				query.set('remark', type === 'Stayed' ? 'Stayed in the same League' : type);
				query.set('leagueId', season._capitalLeague!.id.toString());
				query.set('trophiesEarned', `${trophiesEarned < 0 ? '' : '+'}${trophiesEarned}`);
				query.set('trophies', season._clanCapitalPoints!.toString());
				query.set('globalRank', globalRank ? `Global Rank: ${globalRank}` : '');
				query.set('localRank', countryRank ? `Local Rank: ${countryRank.clans.rank} (${countryRank.country})` : '');

				return interaction.followUp({
					files: [
						new AttachmentBuilder(`${process.env.ASSET_API_BACKEND!}/capital/raid-trophies-card?${query.toString()}`, {
							name: 'capital-raid-trophy-card.jpeg'
						})
					],
					ephemeral: this.muted
				});
			}
		}

		const refreshButton = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(EMOJIS.REFRESH)
			.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId }));

		const downloadButton = new ButtonBuilder()
			.setStyle(ButtonStyle.Success)
			.setLabel('Raid Weekend Cards')
			.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId, card: true }));

		const menu = new StringSelectMenuBuilder()
			.setPlaceholder('Select a card...')
			.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId, _card: true }))
			.setOptions([
				{
					label: 'Raid Weekend Card',
					value: 'medals-card'
				},
				{
					label: 'Raid Trophy Card',
					value: 'trophies-card'
				},
				{
					label: 'Raid Performance Card',
					value: 'performance-card'
				}
			]);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshButton).addComponents(downloadButton);
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
		if (interaction.isButton()) row.setComponents(refreshButton);

		// const isRaidWeek = currentWeekId === weekId;
		const raidSeason = await this.aggregateCapitalRaids(clan, weekId);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const members = raidSeason?.members ?? data?.members ?? [];
		if (!members.length || !data) {
			return interaction.followUp({
				ephemeral: this.muted,
				content: this.i18n('command.capital.raids.no_data', { weekId, clan: clan.name, lng: interaction.locale })
			});
		}

		const previousAttacks = raid.items
			.filter((raid) => raid.state !== 'ongoing')
			.map((item) => item.totalAttacks)
			.slice(0, 10);
		const embed = this.getCapitalRaidEmbed({
			clan,
			weekId,
			members,
			locale: interaction.locale,
			raidSeason: data,
			previousAttacks
		});

		await interaction.editReply({ embeds: [embed], components: [row] });

		const { offensive, defensive } = this.calculateStats(data);
		const url = await this.performancesCardURL({
			clanName: clan.name,
			clanBadgeUrl: clan.badgeUrls.large,
			trophies: clan.clanCapitalPoints || 0,
			startDate: moment(data.startTime).toDate(),
			endDate: moment(data.endTime).toDate(),
			offensive,
			defensive
		}).catch(() => null);

		if (url) embed.setImage(url);
		if (url) await interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async aggregateCapitalRaids(clan: APIClan, weekId: string) {
		const season = await this.client.db
			.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
			.findOne({ weekId, tag: clan.tag });
		if (!season) return null;
		if (!season.members.length) return null;

		const members = season.members.map((m) => ({ ...m, attackLimit: m.attackLimit + m.bonusAttackLimit }));
		clan.memberList.forEach((member) => {
			const raidMember = members.find((mem) => mem.tag === member.tag);
			if (!raidMember) {
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

		return {
			members: members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted),
			data: season as unknown as APICapitalRaidSeason
		};
	}

	private getCapitalRaidEmbed({
		clan,
		weekId,
		members,
		// raidSeason
		locale
	}: {
		clan: APIClan;
		weekId: string;
		locale: string;
		raidSeason: APICapitalRaidSeason;
		previousAttacks: number[];
		members: { name: string; capitalResourcesLooted: number; attacks: number; attackLimit: number }[];
	}) {
		// const totalLoot = members.reduce((acc, cur) => acc + cur.capitalResourcesLooted, 0);
		// const totalAttacks = members.reduce((acc, cur) => acc + cur.attacks, 0);
		const startDate = moment(weekId).toDate();
		const endDate = moment(weekId).clone().add(3, 'days').toDate();

		// const { offensive } = this.calculateStats(raidSeason);
		// previousAttacks.sort((a, b) => a - b);
		// const totalPreviousAttacks = previousAttacks.reduce((acc, cur) => acc + cur, 0);
		// const avgAttacks = totalPreviousAttacks ? totalPreviousAttacks / previousAttacks.length : 0;

		// let avgMax = avgAttacks;
		// if (raidSeason.totalAttacks > avgAttacks) {
		// 	avgMax = previousAttacks.find((a) => a > raidSeason.totalAttacks) ?? raidSeason.totalAttacks;
		// }

		const weekend = Util.raidWeekDateFormat(startDate, endDate);
		const embed = new EmbedBuilder()
			.setAuthor({
				name: `${clan.name} (${clan.tag})`,
				iconURL: clan.badgeUrls.small
			})
			.setTimestamp()
			.setFooter({
				text: [
					// `Looted: ${totalLoot}, Attacks: ${totalAttacks} (Avg. ${offensive.attacksPerRaid}/Raid)`,
					// `Avg. Loot/Raid: ${offensive.lootPerRaid}, Avg. Loot/Attack: ${offensive.lootPerAttack}`,
					`Week of ${weekend}`
				].join('\n')
			});

		embed.setDescription(
			[
				`**${this.i18n('command.capital.raids.title', { lng: locale })}**`,
				'```',
				'\u200e # LOOTED HITS  NAME',
				members
					.map((mem, i) => {
						const rank = (i + 1).toString().padStart(2, ' ');
						const looted = this.padding(mem.capitalResourcesLooted);
						const attacks = `${mem.attacks}/${mem.attackLimit}`.padStart(4, ' ');
						return `\u200e${rank} ${looted} ${attacks}  ${mem.name}`;
					})
					.join('\n'),
				'```'
				// 'Offensive Stats',
				// `Attacks: ${offensive.totalAttacks}`,
				// `Loot: ${offensive.totalLoot}`,
				// `Avg. Attacks/Raid: ${offensive.attacksPerRaid}`,
				// `Avg. Loot/Raid: ${offensive.lootPerRaid}`,
				// `Avg. Loot/Attack: ${offensive.lootPerAttack}`,
				// '',
				// `Avg. Attacks of last 10 weekends: ${avgAttacks.toFixed(2)} / Swapped: ${avgMax}`,
				// `Projected Loot: ${(offensive.lootPerAttack * avgMax).toFixed(0)}`,
				// '',
				// 'Defensive Stats',
				// `Attacks: ${defensive.totalAttacks}`,
				// `Loot: ${defensive.totalLoot}`,
				// `Avg. Attacks/Raid: ${defensive.attacksPerRaid}`,
				// `Avg. Loot/Raid: ${defensive.lootPerRaid}`,
				// `Avg. Loot/Attack: ${defensive.lootPerAttack}`
			].join('\n')
		);

		return embed;
	}

	private calculateStats(raidSeason: APICapitalRaidSeason) {
		const offensive = {
			totalLoot: 0,
			totalAttacks: 0,
			attacksPerRaid: 0,
			lootPerRaid: 0,
			lootPerAttack: 0,
			projectedLoot: 0,
			lootPerClan: [] as number[],
			attacksPerClan: [] as number[]
		};
		const defensive = {
			totalLoot: 0,
			totalAttacks: 0,
			attacksPerRaid: 0,
			lootPerRaid: 0,
			lootPerAttack: 0,
			lootPerClan: [] as number[],
			attacksPerClan: [] as number[]
		};

		for (const defense of raidSeason.defenseLog) {
			defensive.totalAttacks += defense.attackCount;
			const loot = defense.districts.reduce((acc, cur) => acc + cur.totalLooted, 0);
			defensive.totalLoot += loot;

			if (defense.districtsDestroyed === defense.districtCount) {
				defensive.lootPerClan.push(loot);
				defensive.attacksPerClan.push(defense.attackCount);
			}
		}

		// defensive.attacksPerRaid = Number((defensive.totalAttacks / raidSeason.defenseLog.length).toFixed(2));
		defensive.attacksPerRaid = Number(
			(defensive.attacksPerClan.reduce((acc, cur) => acc + cur, 0) / defensive.attacksPerClan.length).toFixed(2)
		);

		// defensive.lootPerRaid = Number((defensive.totalLoot / raidSeason.defenseLog.length).toFixed(2));
		defensive.lootPerRaid = Number(
			(defensive.lootPerClan.reduce((acc, cur) => acc + cur, 0) / defensive.lootPerClan.length).toFixed(2)
		);
		defensive.lootPerAttack = Number((defensive.totalLoot / defensive.totalAttacks).toFixed(2));

		for (const attack of raidSeason.attackLog) {
			offensive.totalAttacks += attack.attackCount;
			const loot = attack.districts.reduce((acc, cur) => acc + cur.totalLooted, 0);
			offensive.totalLoot += loot;

			if (attack.districtsDestroyed === attack.districtCount) {
				offensive.lootPerClan.push(loot);
				offensive.attacksPerClan.push(attack.attackCount);
			}
		}

		// offensive.attacksPerRaid = Number((offensive.totalAttacks / raidSeason.attackLog.length).toFixed(2));
		offensive.attacksPerRaid = Number(
			(offensive.attacksPerClan.reduce((acc, cur) => acc + cur, 0) / offensive.attacksPerClan.length).toFixed(2)
		);

		// offensive.lootPerRaid = Number((offensive.totalLoot / raidSeason.attackLog.length).toFixed(2));
		offensive.lootPerRaid = Number(
			(offensive.lootPerClan.reduce((acc, cur) => acc + cur, 0) / offensive.lootPerClan.length).toFixed(2)
		);
		offensive.lootPerAttack = Number((offensive.totalLoot / offensive.totalAttacks).toFixed(2));
		offensive.projectedLoot = Number((offensive.lootPerAttack * 300).toFixed(2));

		return { offensive, defensive };
	}

	private async performancesCardURL(body: any) {
		const res = await fetch(`${process.env.ASSET_API_BACKEND!}/capital/raid-performance-card`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		}).then((res) => res.json());
		return `${process.env.ASSET_API_BACKEND!}/${(res as any).id as string}`;
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
