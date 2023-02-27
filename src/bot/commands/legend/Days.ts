/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { EmbedBuilder, CommandInteraction, ActionRowBuilder, escapeMarkdown, time, ButtonBuilder, ButtonStyle, User } from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis.js';
import { attackCounts, Collections, LEGEND_LEAGUE_ID } from '../../util/Constants.js';
import { Args, Command } from '../../lib/index.js';
import { Season, Util } from '../../util/index.js';
import { PlayerLinks } from '../../types/index.js';

export default class LegendDaysCommand extends Command {
	public constructor() {
		super('legend-days', {
			category: 'legend',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public args(): Args {
		return {
			player_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	private getDay(day?: number) {
		if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };
		const days = Util.getLegendDays();
		const num = Math.min(days.length, Math.max(day, 1));
		return { ...days[num - 1], day };
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; prev?: boolean; day?: number }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return;

		const embed = args.prev
			? (await this.logs(data)).setColor(this.client.embed(interaction))
			: (await this.embed(interaction, data, args.day)).setColor(this.client.embed(interaction));

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ cmd: this.id, prev: args.prev, tag: data.tag }))
					.setStyle(ButtonStyle.Secondary)
			)
			.addComponents(
				new ButtonBuilder()
					.setLabel(args.prev ? 'Current Day' : 'Previous Days')
					.setCustomId(JSON.stringify({ cmd: this.id, prev: !args.prev, _: 1, tag: data.tag }))
					.setStyle(args.prev ? ButtonStyle.Success : ButtonStyle.Primary)
			);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	public async getPlayers(userId: string) {
		const players = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).find({ userId }).toArray();
		const others = await this.client.http.getPlayerTags(userId);
		const playerTagSet = new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]);

		return (
			await Promise.all(
				Array.from(playerTagSet)
					.slice(0, 25)
					.map((tag) => this.client.http.player(tag))
			)
		).filter((res) => res.ok);
	}

	private calc(clanRank: number) {
		if (clanRank >= 41) return 3;
		else if (clanRank >= 31) return 10;
		else if (clanRank >= 21) return 12;
		else if (clanRank >= 11) return 25;
		return 50;
	}

	private async rankings(tag: string) {
		const ranks = await this.client.db
			.collection(Collections.PLAYER_RANKS)
			.aggregate<{ country: string; countryCode: string; players: { rank: number } }>([
				{
					$match: {
						season: Season.ID
					}
				},
				{
					$unwind: {
						path: '$players'
					}
				},
				{
					$match: {
						'players.tag': tag
					}
				}
			])
			.toArray();

		return {
			globalRank: ranks.find(({ countryCode }) => countryCode === 'global')?.players.rank ?? null,
			countryRank: ranks.find(({ countryCode }) => countryCode !== 'global') ?? null
		};
	}

	private async embed(interaction: CommandInteraction<'cached'>, data: Player, _day?: number) {
		const seasonId = Season.ID;
		const legend = (await this.client.redis.json.get(`LP-${seasonId}-${data.tag}`)) as {
			name: string;
			tag: string;
			logs: LogType[];
		} | null;
		const clan = data.clan ? ((await this.client.redis.json.get(`C${data.clan.tag}`)) as Clan | null) : null;

		const { startTime, endTime, day } = this.getDay(_day);
		const logs = (legend?.logs ?? []).filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
		const attacks = logs.filter((en) => en.inc > 0) ?? [];
		const defenses = logs.filter((en) => en.inc <= 0) ?? [];

		const member = (clan?.memberList ?? []).find((en) => en.tag === data.tag);
		const clanRank = member?.clanRank ?? 0;
		const percentage = this.calc(clanRank);

		const [initial] = logs;
		const [current] = logs.slice(-1);

		const attackCount = attacks.length;
		const defenseCount = defenses.length;

		const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
		const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

		const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

		const { globalRank, countryRank } = await this.rankings(data.tag);

		const weaponLevel = data.townHallWeaponLevel ? attackCounts[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
		embed.setDescription(
			[
				`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
					data.league?.id === LEGEND_LEAGUE_ID ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
				} **${data.trophies}**`,
				''
			].join('\n')
		);

		embed.addFields([
			{
				name: '**Overview**',
				value: [
					`• Initial Trophies: ${initial?.start || data.trophies}`,
					`• Current Trophies: ${current?.end || data.trophies}`,
					` • ${attackCount} attack${attackCount === 1 ? '' : 's'} (+${trophiesFromAttacks} trophies)`,
					` • ${defenseCount} defense${defenseCount === 1 ? '' : 's'} (${trophiesFromDefenses} trophies)`,
					` • ${Math.abs(netTrophies)} trophies ${netTrophies >= 0 ? 'earned' : 'lost'}`
				].join('\n')
			},
			{
				name: '**Ranking**',
				value: [
					`• Global Rank: ${globalRank ?? 'N/A'}`,
					`• Local Rank: ${
						countryRank
							? `${countryRank.players.rank} (${countryRank.country} :flag_${countryRank.countryCode.toLowerCase()}:)`
							: 'N/A'
					}`
				].join('\n')
			}
		]);

		if (clan && member) {
			embed.addFields([
				{
					name: '**Clan**',
					value: [
						`• ${clan ? `${clan.name} (${clan.tag})` : 'N/A'}`,
						`• Rank in Clan: ${member.clanRank}`,
						`• Clan Points Contribution: ${Math.floor((member.trophies * percentage) / 100)} (${percentage}%)`
					].join('\n')
				}
			]);
		}

		embed.addFields([
			{
				name: '**Attacks**',
				value: attacks.length
					? attacks.map((m) => `\` ${`+${m.inc}`.padStart(3, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
					: '-',
				inline: true
			},
			{
				name: '**Defenses**',
				value: defenses.length
					? defenses.map((m) => `\` ${`-${Math.abs(m.inc)}`.padStart(3, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
					: '-',
				inline: true
			}
		]);

		// const seasonId = Util.getLegendDay() === 0 ? Season.previousID : Season.ID;
		embed.setFooter({ text: `Day ${day} (${Season.ID})` });
		return embed;
	}

	private async logs(data: Player) {
		const seasonId = Season.ID;
		const legend = (await this.client.redis.json.get(`LP-${seasonId}-${data.tag}`)) as {
			name: string;
			tag: string;
			logs: LogType[];
		} | null;
		const logs = legend?.logs ?? [];

		const days = Util.getLegendDays();

		const perDayLogs = days.reduce<{ attackCount: number; defenseCount: number; gain: number; loss: number; final: number }[]>(
			(prev, { startTime, endTime }) => {
				const mixedLogs = logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
				const attacks = mixedLogs.filter((en) => en.inc > 0) ?? [];
				const defenses = mixedLogs.filter((en) => en.inc <= 0) ?? [];

				const attackCount = attacks.length;
				const defenseCount = defenses.length;
				const [final] = mixedLogs.slice(-1);

				const gain = attacks.reduce((acc, cur) => acc + cur.inc, 0);
				const loss = defenses.reduce((acc, cur) => acc + cur.inc, 0);

				prev.push({ attackCount, defenseCount, gain, loss, final: final?.end ?? '-' });
				return prev;
			},
			[]
		);

		const weaponLevel = data.townHallWeaponLevel ? attackCounts[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
		embed.setDescription(
			[
				...[
					`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
						data.league?.id === 29000022 ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
					} **${data.trophies}**`,
					''
				],
				`**Legend Season Logs (${Season.ID})**`,
				`• ${data.attackWins} ${Util.plural(data.attackWins, 'attack')} and ${data.defenseWins} ${Util.plural(
					data.defenseWins,
					'defense'
				)} won`,
				'',
				'`DAY` ` GAIN ` ` LOSS ` ` FINAL`',
				...perDayLogs.map(
					(day, i) =>
						`\`\u200e${(i + 1).toString().padStart(2, ' ')} \` \`${this.pad(
							`+${day.gain}${attackCounts[Math.min(9, day.attackCount)]}`,
							5
						)} \` \`${this.pad(`-${Math.abs(day.loss)}${attackCounts[Math.min(9, day.defenseCount)]}`, 5)} \` \` ${this.pad(
							day.final,
							4
						)} \``
				)
			].join('\n')
		);

		return embed;
	}

	private pad(num: number | string, padding = 4) {
		return num.toString().padStart(padding, ' ');
	}
}

interface LogType {
	start: number;
	end: number;
	timestamp: number;
	inc: number;
	type?: string;
}
