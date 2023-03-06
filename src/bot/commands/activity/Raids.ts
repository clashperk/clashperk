import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	embedLength,
	User
} from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';
import { RaidSeason } from '../../struct/Http.js';

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
			const player = args.player_tag ? await this.client.resolver.resolvePlayer(interaction, args.player_tag) : null;
			if (args.player_tag && !player) return null;
			return this.forUsers(interaction, { user: args.user, player });
		}

		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const currentWeekId = this.raidWeek().weekId;
		const weekId = args.week ?? currentWeekId;

		if (args.card) {
			const season = await this.client.db
				.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
				.findOne({ weekId, tag: clan.tag });

			const res = await this.client.http.getRaidLastSeason(clan);
			if (!res.ok || !res.items.length) {
				return interaction.followUp({
					content: `Raid weekend info isn't available for ${clan.name} (${clan.tag})`
				});
			}

			const data = res.items.find((item) => moment(item.startTime).format('YYYY-MM-DD') === weekId);
			if (!data) {
				return interaction.followUp({
					content: `Raid weekend info isn't available for ${clan.name} (${clan.tag})`
				});
			}

			const offensiveReward = this.client.http.calcRaidMedals(data.attackLog);
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
					new AttachmentBuilder(`https://chart.clashperk.com/raid-weekend-card?${query.toString()}`, {
						name: 'capital-raid-weekend-card.jpeg'
					})
				]
			});

			if (hasTrophyCard) {
				const { globalRank, countryRank } = await this.rankings(clan.tag);
				const type =
					season!._capitalLeague!.id > season!.capitalLeague!.id
						? 'Promoted'
						: season!._capitalLeague!.id === season!.capitalLeague!.id
						? 'Stayed'
						: 'Demoted';
				const trophiesEarned = season!._clanCapitalPoints! - season!.clanCapitalPoints!;

				query.set('type', type);
				query.set('remark', type === 'Stayed' ? 'Stayed in the same League' : type);
				query.set('leagueId', season!._capitalLeague!.id.toString());
				query.set('trophiesEarned', `${trophiesEarned < 0 ? '' : '+'}${trophiesEarned}`);
				query.set('trophies', season!._clanCapitalPoints!.toString());
				query.set('globalRank', globalRank ? `Global Rank: ${globalRank}` : '');
				query.set('localRank', countryRank ? `Local Rank: ${countryRank.clans.rank} (${countryRank.country})` : '');

				return interaction.followUp({
					files: [
						new AttachmentBuilder(`https://chart.clashperk.com/raid-trophy-card?${query.toString()}`, {
							name: 'capital-raid-trophy-card.jpeg'
						})
					]
				});
			}
		}

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId }))
			)
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Success)
					.setLabel('Raid Weekend Card')
					.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId, card: true }))
			);

		const isRaidWeek = currentWeekId === weekId;
		const raidSeason = isRaidWeek ? await this.getRaidsFromAPI(clan) : await this.aggregateCapitalRaids(clan, weekId);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!raidSeason?.members?.length) {
			return interaction.followUp({
				content: this.i18n('command.capital.raids.no_data', { weekId, clan: clan.name, lng: interaction.locale })
			});
		}

		const embed = this.getCapitalRaidEmbed({
			clan,
			weekId,
			members: raidSeason.members,
			locale: interaction.locale,
			raidSeason: raidSeason.data
		});

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async forUsers(interaction: CommandInteraction<'cached'>, { user, player }: { user?: User; player?: Player | null }) {
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(user!.id);
		const _players = await this.client.db
			.collection(Collections.CAPITAL_RAID_SEASONS)
			.aggregate<{
				name: string;
				tag: string;
				raids: { capitalResourcesLooted: number; weekId: string; bonusAttackLimit: number; attackLimit: number; attacks: number }[];
			}>([
				{
					$match: {
						'members.tag': {
							$in: [...playerTags.slice(0, 25)]
						},
						'createdAt': {
							$gte: moment().subtract(6, 'months').toDate()
						}
					}
				},
				{
					$unwind: {
						path: '$members'
					}
				},
				{
					$match: {
						'members.tag': {
							$in: [...playerTags.slice(0, 25)]
						}
					}
				},
				{
					$sort: {
						_id: -1
					}
				},
				{
					$group: {
						_id: '$members.tag',
						name: {
							$first: '$members.name'
						},
						tag: {
							$first: '$members.tag'
						},
						raids: {
							$push: {
								weekId: '$weekId',
								clan: {
									name: '$name',
									tag: '$tag'
								},
								name: '$members.name',
								tag: '$members.tag',
								attacks: '$members.attacks',
								attackLimit: '$members.attackLimit',
								bonusAttackLimit: '$members.bonusAttackLimit',
								capitalResourcesLooted: '$members.capitalResourcesLooted'
							}
						}
					}
				}
			])
			.toArray();

		const embeds: EmbedBuilder[] = [];
		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle('Capital raid history (last 3 months)');
		if (user && !player) embed.setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL() });

		_players.sort((a, b) => b.raids.length - a.raids.length);
		_players.slice(0, 25).map((member) => {
			embed.addFields({
				name: `${member.name} (${member.tag})`,
				value: [
					'```',
					'\u200e # LOOTED HITS  WEEKEND',
					member.raids
						.slice(0, 20)
						.map((raid, i) => {
							const looted = this.padding(raid.capitalResourcesLooted);
							const attacks = `${raid.attacks}/${raid.attackLimit + raid.bonusAttackLimit}`.padStart(4, ' ');
							return `\u200e${(i + 1).toString().padStart(2, ' ')} ${looted} ${attacks}  ${moment(raid.weekId)
								.format('D MMM')
								.padStart(6, ' ')}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			});
		});
		embeds.push(embed);

		if (embedLength(embed.toJSON()) > 6000) {
			const fieldsSize = embed.data.fields!.length;
			embeds.push(
				new EmbedBuilder()
					.setColor(this.client.embed(interaction))
					.addFields(embed.data.fields!.splice(Math.floor(fieldsSize / 2), 25))
			);
		}

		for (const embed of embeds) {
			await interaction.followUp({ embeds: [embed] });
		}
	}

	private async getRaidsFromAPI(clan: Clan) {
		const res = await this.client.http.getRaidSeason(clan);
		if (!res.ok) return null;
		if (!res.items.length) return null;
		const data = res.items[0];
		if (!data?.members?.length) return null; // eslint-disable-line

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

		return { members: members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted), data };
	}

	private async aggregateCapitalRaids(clan: Clan, weekId: string) {
		const season = await this.client.db
			.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
			.findOne({ weekId, tag: clan.tag });
		if (!season) return null;
		if (!season.members.length) return null;

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

		return {
			members: members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted),
			data: season as unknown as RaidSeason
		};
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
		raidSeason: RaidSeason;
		members: { name: string; capitalResourcesLooted: number; attacks: number; attackLimit: number }[];
	}) {
		const startDate = moment(weekId).toDate();
		const endDate = moment(weekId).clone().add(3, 'days').toDate();

		const weekend = Util.raidWeekDateFormat(startDate, endDate);
		const embed = new EmbedBuilder()
			.setAuthor({
				name: `${clan.name} (${clan.tag})`,
				iconURL: clan.badgeUrls.small
			})
			.setTimestamp()
			.setFooter({ text: `Week of ${weekend}` });

		embed.setDescription(
			[
				`**${this.i18n('command.capital.raids.title', { lng: locale })}**`,
				'```',
				'\u200e # LOOTED HITS  NAME',
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
