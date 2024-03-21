import { APIClanWar, APIClanWarLeagueGroup } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections, UnrankedWarLeagueId, WarLeagueMap, promotionMap } from '../../util/Constants.js';
import { CWL_LEAGUES, EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

const suffixes = new Map([
	['one', 'st'],
	['two', 'nd'],
	['few', 'rd'],
	['other', 'th']
]);

export default class SummaryCWLRanks extends Command {
	public constructor() {
		super('summary-cwl-ranks', {
			category: 'none',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string }) {
		const season = args.season === Season.ID ? null : args.season;
		const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
		if (!clans) return;

		const __clans = await this.client.http._getClans(clans);

		const chunks = [];
		for (const clan of __clans) {
			const result = season ? null : await this.client.http.getClanWarLeagueGroup(clan.tag);
			if (season || !result?.res.ok || ['notInWar', 'ended'].includes(result.body.state)) {
				const data = await this.client.storage.getWarTags(clan.tag, season);
				if (data && data.season !== Season.ID) continue;

				if (!data) continue;
				if (!data.leagues?.[clan.tag]) continue;

				if (args.season && data.season !== args.season) continue;
				const ranking = await this.rounds(data, clan.tag, season);
				if (!ranking) continue;

				chunks.push({
					warLeagueId: data.leagues[clan.tag],
					...ranking,
					status: 'ended'
				});
				continue;
			}

			if (args.season && result.body.season !== args.season) continue;
			if (result.body.season !== Season.ID) continue;

			const ranking = await this.rounds(result.body, clan.tag);
			if (!ranking) continue;

			chunks.push({
				warLeagueId: clan.warLeague?.id ?? UnrankedWarLeagueId,
				...ranking,
				status: result.body.state
			});
		}

		const leagueGroups = Object.entries(
			chunks.reduce<Record<string, { rank: number; name: string; tag: string; stars: number; status: string }[]>>((acc, cur) => {
				acc[cur.warLeagueId] ??= []; // eslint-disable-line
				acc[cur.warLeagueId].push({ ...cur.clan, rank: cur.rank, stars: cur.clan.stars, status: cur.status });
				return acc;
			}, {})
		);

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction)).setDescription(`${EMOJIS.CWL} **Clan War League Ranking**`);
		leagueGroups.sort(([a], [b]) => Number(b) - Number(a));
		leagueGroups.forEach(([leagueId, clans], i) => {
			clans.sort((a, b) => b.stars - a.stars);
			clans.sort((a, b) => a.rank - b.rank);

			const __clans = clans.map((clan) => {
				const emoji =
					clan.rank <= promotionMap[leagueId].promotion
						? EMOJIS.UP_KEY
						: clan.rank >= promotionMap[leagueId].demotion
						? EMOJIS.DOWN_KEY
						: EMOJIS.STAYED_SAME;
				const stars = clan.stars.toString().padStart(3, ' ');
				const name = escapeMarkdown(clan.name);
				const label = `${emoji} \`${this.formatRank(clan.rank)}\`${EMOJIS.MINI_STAR}\`${stars}\` \u2002${name}`;
				return `\u200e${label}`;
			});

			const emptySpace = Util.extraSpace(leagueGroups.length, i);
			const chunks = Util.splitMessage(`${__clans.join('\n')}${emptySpace}`, { maxLength: 1024 });
			chunks.forEach((chunk, i) => {
				embed.addFields({
					name: i === 0 ? `${CWL_LEAGUES[WarLeagueMap[leagueId]]} ${WarLeagueMap[leagueId]}` : '\u200b',
					value: chunk
				});
			});
		});

		if (!chunks.length) {
			return interaction.editReply(this.i18n('command.cwl.no_season_data', { lng: interaction.locale, season: season ?? Season.ID }));
		}

		const customId = this.createId({ cmd: this.id, clans: resolvedArgs, season: args.season });
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setCustomId(customId).setStyle(ButtonStyle.Secondary)
		);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async rounds(body: APIClanWarLeagueGroup, clanTag: string, season?: string | null) {
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
		const ranking: {
			[key: string]: {
				name: string;
				tag: string;
				stars: number;
				attacks: number;
				destruction: number;
			};
		} = {};

		const warTags = rounds.flatMap((r) => r.warTags);
		const wars = season
			? await this.client.db
					.collection<APIClanWar>(Collections.CLAN_WARS)
					.find({ warTag: { $in: warTags } })
					.toArray()
			: (await Promise.all(warTags.map((warTag) => this.client.http.getClanWarLeagueRound(warTag))))
					.filter(({ res }) => res.ok)
					.map(({ body }) => body);
		for (const data of wars) {
			if (data.state === 'notInWar' && !season) continue;

			// eslint-disable-next-line
			ranking[data.clan.tag] ??= {
				name: data.clan.name,
				tag: data.clan.tag,
				stars: 0,
				destruction: 0,
				attacks: 0
			};
			const clan = ranking[data.clan.tag];

			clan.stars += data.clan.stars;
			if (data.state === 'warEnded' && this.client.http.isWinner(data.clan, data.opponent)) {
				clan.stars += 10;
			}
			clan.attacks += data.clan.attacks;
			clan.destruction += data.clan.destructionPercentage * data.teamSize;

			// eslint-disable-next-line
			ranking[data.opponent.tag] ??= {
				name: data.opponent.name,
				tag: data.opponent.tag,
				stars: 0,
				destruction: 0,
				attacks: 0
			};
			const opponent = ranking[data.opponent.tag];

			opponent.stars += data.opponent.stars;
			if (data.state === 'warEnded' && this.client.http.isWinner(data.opponent, data.clan)) {
				opponent.stars += 10;
			}
			opponent.attacks += data.opponent.attacks;
			opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
		}

		const _ranking = Object.values(ranking).sort(this.rankingSort);
		if (!_ranking.length) return null;
		const index = _ranking.findIndex((r) => r.tag === clanTag);
		const rank = index + 1;
		return { rank, clan: _ranking[index] };
	}

	private formatRank(n: number) {
		const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
		const rule = pr.select(n);
		const suffix = suffixes.get(rule);
		return `${n}${suffix!}`;
	}

	private rankingSort(a: { stars: number; destruction: number }, b: { stars: number; destruction: number }) {
		if (a.stars === b.stars) return b.destruction - a.destruction;
		return b.stars - a.stars;
	}
}
