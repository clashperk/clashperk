import { Clan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder, Guild } from 'discord.js';
import { Command } from '../../lib/index.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { CapitalLeagueMap, Collections, UnrankedCapitalLeagueId, UnrankedWarLeagueId, WarLeagueMap } from '../../util/Constants.js';
import { CAPITAL_LEAGUES, CWL_LEAGUES, EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class SummaryLeaguesCommand extends Command {
	public constructor() {
		super('summary-leagues', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const __clans = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		const embed = this.getWarLeagueGroups(interaction.guild, __clans);

		const customIds = {
			capital: this.client.uuid(),
			cwl: this.client.uuid()
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setLabel('Capital Leagues')
				.setEmoji(EMOJIS.CAPITAL_TROPHY)
				.setStyle(ButtonStyle.Primary)
				.setCustomId(customIds.capital)
		);
		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id
			// time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.capital) {
				row.setComponents(
					new ButtonBuilder()
						.setLabel('Clan War Leagues')
						.setEmoji(EMOJIS.CWL)
						.setStyle(ButtonStyle.Primary)
						.setCustomId(customIds.cwl)
				);
				const embed = await this.getCapitalLeagueGroups(interaction.guild, __clans);
				await action.update({ embeds: [embed], components: [row] });
			}
			if (action.customId === customIds.cwl) {
				row.setComponents(
					new ButtonBuilder()
						.setLabel('Capital Leagues')
						.setEmoji(EMOJIS.CAPITAL_TROPHY)
						.setStyle(ButtonStyle.Primary)
						.setCustomId(customIds.capital)
				);
				const embed = this.getWarLeagueGroups(interaction.guild, __clans);
				await action.update({ embeds: [embed], components: [row] });
			}
		});

		return interaction.editReply({ embeds: [embed] });
	}

	private getWarLeagueId(clan: Clan) {
		return clan.warLeague?.id ?? UnrankedWarLeagueId;
	}

	private getCapitalLeagueId(clan: Clan) {
		return clan.capitalLeague?.id ?? UnrankedCapitalLeagueId;
	}

	private getWarLeagueGroups(guild: Guild, clans: Clan[]) {
		const leagueGroup = Object.entries(
			clans.reduce<Record<string, Clan[]>>((acc, clan) => {
				const league = this.getWarLeagueId(clan);
				acc[league] ??= []; // eslint-disable-line
				acc[league].push(clan);
				return acc;
			}, {})
		);

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(guild.id)).setDescription(`${EMOJIS.CWL} **Clan War League Groups**`);
		leagueGroup
			.sort(([a], [b]) => Number(b) - Number(a))
			.map(([leagueId, clans], i) => {
				const emptySpace = this.extraSpace(leagueGroup.length, i);
				embed.addFields({
					name: `${CWL_LEAGUES[WarLeagueMap[leagueId]]} ${WarLeagueMap[leagueId]}`,
					value: `${clans.map((clan) => `\u200e${Util.escapeBackTick(clan.name)} (${clan.tag})`).join('\n')}${emptySpace}`
				});
			});

		return embed;
	}

	private getLastWeekId() {
		const { isRaidWeek, weekDate, weekId } = this.raidWeek();
		if (isRaidWeek) {
			weekDate.setUTCDate(weekDate.getUTCDate() - 7);
			return weekDate.toISOString().substring(0, 10);
		}
		return weekId;
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

	private async getCapitalLeagueGroups(guild: Guild, clans: Clan[]) {
		const leagueGroup = Object.entries(
			clans.reduce<Record<string, Clan[]>>((acc, clan) => {
				const league = this.getCapitalLeagueId(clan);
				acc[league] ??= []; // eslint-disable-line
				acc[league].push(clan);
				return acc;
			}, {})
		);

		const leagues = await this.client.db
			.collection<Required<ClanCapitalRaidAttackData>>(Collections.CAPITAL_RAID_SEASONS)
			.find({ tag: { $in: clans.map((clan) => clan.tag) }, weekId: this.getLastWeekId() })
			.toArray();

		const leaguesMap = leagues.reduce<Record<string, { gained: number; emoji: string }>>((acc, league) => {
			if (league._clanCapitalPoints && league.clanCapitalPoints) {
				const emoji =
					league._capitalLeague.id > league.capitalLeague.id
						? EMOJIS.UP_KEY
						: league._capitalLeague.id === league.capitalLeague.id
						? EMOJIS.STAYED_SAME
						: EMOJIS.DOWN_KEY;
				acc[league.tag] = { gained: league._clanCapitalPoints - league.clanCapitalPoints, emoji };
			}
			return acc;
		}, {});

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(guild.id)).setDescription(`${EMOJIS.CAPITAL_TROPHY} **Clan Capital League Groups**`);

		leagueGroup
			.sort(([a], [b]) => Number(b) - Number(a))
			.map(([leagueId, clans], i) => {
				const emptySpace = this.extraSpace(leagueGroup.length, i);
				clans.sort((a, b) => (b.clanCapitalPoints ?? 0) - (a.clanCapitalPoints ?? 0));
				embed.addFields({
					name: `${CAPITAL_LEAGUES[leagueId]} ${CapitalLeagueMap[leagueId]}`,
					value: `${clans
						.map((clan) => {
							const capitalPoints = (clan.clanCapitalPoints ?? 0).toString().padStart(4, ' ');
							const _gained = leaguesMap[clan.tag]?.gained ?? 0; // eslint-disable-line
							const gained = `${_gained >= 0 ? '+' : ''}${_gained}`.padStart(4, ' ');
							const name = Util.escapeBackTick(clan.name);
							const emoji = leaguesMap[clan.tag]?.emoji || EMOJIS.CAPITAL_TROPHY; // eslint-disable-line
							return `\u200e${emoji} \`${capitalPoints}\` \`${gained}\` \u2002${name}`;
						})
						.join('\n')}${emptySpace}`
				});
			});
		return embed;
	}

	private extraSpace(len: number, index: number) {
		return index === len - 1 ? '' : '\n\u200b';
	}
}
