/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
	EmbedBuilder,
	CommandInteraction,
	StringSelectMenuBuilder,
	ActionRowBuilder,
	escapeMarkdown,
	ComponentType,
	time
} from 'discord.js';
import { Clan, Player, WarClan } from 'clashofclans.js';
import ms from 'ms';
import moment from 'moment';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';
import { UserInfoModel } from '../../types/index.js';

const weaponLevels: Record<string, string> = {
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵'
};

export default class LegendLogsCommand extends Command {
	public constructor() {
		super('legend-logs', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Player summary and some basic details.'
			},
			defer: true
		});
	}

	public async getPlayers(userId: string) {
		const data = await this.client.db.collection<UserInfoModel>(Collections.LINKED_PLAYERS).findOne({ user: userId });
		const others = await this.client.http.getPlayerTags(userId);

		const playerTagSet = new Set([...(data?.entries ?? []).map((en) => en.tag), ...others.map((tag) => tag)]);

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

	private getDates() {
		const start = moment().startOf('day').add(5, 'hours');
		return { startTime: start.toDate().getTime(), endTime: start.add(1, 'day').subtract(1, 'second').toDate().getTime() };
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag, 1);
		if (!data) return;

		const embed = (await this.embed(interaction, data)).setColor(this.client.embed(interaction));
		const msg = await interaction.editReply({ embeds: [embed] });

		if (!data.user) return;
		const players = await this.getPlayers(data.user.id);
		if (!players.length) return;

		const options = players.map((op) => ({
			description: op.tag,
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const customID = this.client.uuid(interaction.user.id);
		const menu = new StringSelectMenuBuilder().setCustomId(customID).setPlaceholder('Select an account!').addOptions(options);

		await interaction.editReply({ components: [new ActionRowBuilder<StringSelectMenuBuilder>({ components: [menu] })] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => [customID].includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID && action.isStringSelectMenu()) {
				await action.deferUpdate();
				const data = players.find((en) => en.tag === action.values[0])!;
				const embed = (await this.embed(interaction, data)).setColor(this.client.embed(interaction));
				await action.editReply({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async rankings(tag: string) {
		const res = await this.client.http.playerRanks('global');
		if (!res.ok) return null;
		return res.items.find((en) => en.tag === tag)?.rank ?? null;
	}

	private async embed(interaction: CommandInteraction<'cached'>, data: Player) {
		const legend = (await this.client.redis.json.get(`LP${data.tag}`)) as {
			name: string;
			tag: string;
			logs: { start: number; end: number; timestamp: number; inc: number; type?: string }[];
		} | null;
		const clan = data.clan ? ((await this.client.redis.json.get(`C${data.clan.tag}`)) as Clan | null) : null;

		const { startTime, endTime } = this.getDates();

		const logs = (legend?.logs ?? []).filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
		const attacks = logs.filter((en) => en.inc > 0 || en.type === 'attack') ?? [];
		const defenses = logs.filter((en) => en.inc < 0 || en.type === 'defense') ?? [];

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

		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
		embed.setDescription(
			[
				`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
					data.league?.id === 29000022 ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
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
				name: '**Rankings**',
				value: [
					`• Global Rank: ${(await this.rankings(data.tag)) ?? 'N/A'}`,
					`• Local Rank: ${(await this.rankings(data.tag)) ?? 'N/A'}`
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
					? attacks.map((m) => `\` +${m.inc.toString().padStart(2, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
					: '-',
				inline: true
			},
			{
				name: '**Defenses**',
				value: defenses.length
					? defenses.map((m) => `\` ${m.inc.toString().padStart(2, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
					: '-',
				inline: true
			}
		]);
		embed.setFooter({ text: `Day ${moment().diff(Season.startTimestamp, 'days')} (${Season.ID})` });
		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e9
			? `${(Math.abs(num) / 1.0e9).toFixed(2)}B`
			: // Six Zeroes for Millions
			Math.abs(num) >= 1.0e6
			? `${(Math.abs(num) / 1.0e6).toFixed(2)}M`
			: // Three Zeroes for Thousands
			Math.abs(num) >= 1.0e3
			? `${(Math.abs(num) / 1.0e3).toFixed(2)}K`
			: Math.abs(num).toFixed(2);
	}

	private async getWars(tag: string) {
		const member = {
			tag,
			total: 0,
			of: 0,
			attacks: 0,
			stars: 0,
			dest: 0,
			defStars: 0,
			defDestruction: 0,
			starTypes: [] as number[],
			defCount: 0
		};

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.find({
				preparationStartTime: { $gte: Season.startTimestamp },
				$or: [{ 'clan.members.tag': tag }, { 'opponent.members.tag': tag }],
				state: { $in: ['inWar', 'warEnded'] }
			})
			.sort({ preparationStartTime: -1 })
			.toArray();

		for (const data of wars) {
			const clan: WarClan = data.clan.members.find((m: any) => m.tag === tag) ? data.clan : data.opponent;
			member.total += 1;
			for (const m of clan.members) {
				if (m.tag !== tag) continue;
				member.of += data.attacksPerMember;

				if (m.attacks) {
					member.attacks += m.attacks.length;
					member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
					member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
					member.starTypes.push(...m.attacks.map((atk) => atk.stars));
				}

				if (m.bestOpponentAttack) {
					member.defStars += m.bestOpponentAttack.stars;
					member.defDestruction += m.bestOpponentAttack.destructionPercentage;
					member.defCount += 1;
				}
			}
		}

		return member;
	}

	private getLastSeen(lastSeen: Date) {
		const timestamp = Date.now() - lastSeen.getTime();
		return timestamp <= 1 * 24 * 60 * 60 * 1000
			? 'Today'
			: timestamp <= 2 * 24 * 60 * 60 * 1000
			? 'Yesterday'
			: `${ms(timestamp, { long: true })} ago`;
	}

	private async getLinkedUser(interaction: CommandInteraction<'cached'>, tag: string) {
		const data = await Promise.any([this.getLinkedFromDb(tag), this.client.http.getLinkedUser(tag)]);
		if (!data) return null;

		const user = await interaction.guild.members.fetch(data.user).catch(() => null);
		return { mention: user?.toString() ?? null, userId: data.user };
	}

	private async getLinkedFromDb(tag: string) {
		const data = await this.client.db.collection<UserInfoModel>(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
		if (!data) return Promise.reject(0);
		return data;
	}
}
