import { APIClan, APIClanWar, APIClanWarLeagueGroup, APIWarClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { BLUE_NUMBERS, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS, WHITE_NUMBERS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class CWLRosterCommand extends Command {
	public constructor() {
		super('cwl-roster', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const { body, res } = await this.client.http.getClanWarLeagueGroup(clan.tag);
		if (res.status === 504 || body.state === 'notInWar') {
			return interaction.editReply(
				this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		if (!res.ok) {
			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		return this.rounds(interaction, { body, clan, args });
	}

	private async fetch(warTag: string) {
		const { body, res } = await this.client.http.getClanWarLeagueRound(warTag);
		return { warTag, ...body, ...res };
	}

	private async rounds(
		interaction: CommandInteraction<'cached'>,
		{
			body,
			clan,
			args
		}: {
			body: APIClanWarLeagueGroup;
			clan: APIClan;
			args: { tag?: string; user?: User; detailed?: boolean };
		}
	) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));

		const clanRounds = [];
		let [stars, destruction] = [0, 0];
		const ranking: {
			[key: string]: {
				name: string;
				tag: string;
				stars: number;
				destruction: number;
			};
		} = {};

		const warTags = rounds.map((round) => round.warTags).flat();
		const wars: (APIClanWar & { warTag: string; ok: boolean })[] = await Promise.all(warTags.map((warTag) => this.fetch(warTag)));
		for (const data of body.clans) {
			ranking[data.tag] = {
				name: data.name,
				tag: data.tag,
				stars: 0,
				destruction: 0
			};
		}

		for (const data of wars) {
			if (!data.ok) continue;

			const clan = ranking[data.clan.tag];
			const opponent = ranking[data.opponent.tag];

			if (data.state === 'inWar') {
				clan.stars += data.clan.stars;
				clan.destruction += data.clan.destructionPercentage * data.teamSize;

				opponent.stars += data.opponent.stars;
				opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
			}

			if (data.state === 'warEnded') {
				clan.stars += this.winner(data.clan, data.opponent) ? data.clan.stars + 10 : data.clan.stars;
				clan.destruction += data.clan.destructionPercentage * data.teamSize;

				opponent.stars += this.winner(data.opponent, data.clan) ? data.opponent.stars + 10 : data.opponent.stars;
				opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
			}

			if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
				const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
				const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
				if (data.state === 'warEnded') {
					stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
				}
				if (data.state === 'inWar') {
					stars += clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
				}

				clanRounds.push({
					clan,
					opponent,
					state: data.state,
					round: body.rounds.findIndex((round) => round.warTags.includes(data.warTag))
				});
			}
		}

		const flatTownHalls = body.clans
			.map((clan) => clan.members)
			.flat()
			.map((mem) => mem.townHallLevel);
		const [max, min] = [Math.max(...flatTownHalls), Math.min(...flatTownHalls)];
		const townHalls = Array(Math.min(5, max - min + 1))
			.fill(0)
			.map((_, i) => max - i);

		const ranks = Object.values(ranking);
		ranks.sort((a, b) => b.destruction - a.destruction).sort((a, b) => b.stars - a.stars);
		const next = clanRounds.find((round) => round.state === 'preparation');
		const rank = ranks.findIndex((a) => a.tag === clanTag);

		const summarizedEmbed = new EmbedBuilder().setColor(this.client.embed(interaction));
		summarizedEmbed.setDescription(
			[
				'**Clan War League Rosters**',
				`${EMOJIS.HASH} ${townHalls.map((th) => ORANGE_NUMBERS[th]).join('')} **Clan**`,
				ranks
					.sort((a, b) => b.stars - a.stars)
					.map((clan, i) => `${BLUE_NUMBERS[++i]} ${this.flat(clan.tag, townHalls, body)} \u200e${clan.name}`)
					.join('\n')
			].join('\n')
		);

		if (next) {
			const oppRank = ranks.findIndex((clan) => clan.tag === next.opponent.tag);
			const flatTownHalls = [...next.clan.members, ...next.opponent.members].map((mem) => mem.townhallLevel);
			const [max, min] = [Math.max(...flatTownHalls), Math.min(...flatTownHalls)];
			const townHalls = Array(Math.max(Math.min(5, max - min + 1), 2))
				.fill(0)
				.map((_, i) => max - i);

			summarizedEmbed.addFields([
				{
					name: '\u200e',
					value: [
						`**Next War (Round #${next.round + 1})**`,
						`${EMOJIS.HASH} ${townHalls.map((th) => ORANGE_NUMBERS[th]).join('')} **Clan**`,
						`${BLUE_NUMBERS[rank + 1]} ${this.getNextRoster(next.clan, townHalls)} \u200e${next.clan.name}`,
						`${BLUE_NUMBERS[oppRank + 1]} ${this.getNextRoster(next.opponent, townHalls)} \u200e${next.opponent.name}`
					].join('\n')
				}
			]);
		}

		if (next?.round || rounds.length >= 2) {
			summarizedEmbed.addFields([
				{
					name: '\u200b',
					value: `Rank #${rank + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`
				}
			]);
		}

		const detailedEmbed = new EmbedBuilder();
		detailedEmbed
			.setFooter({ text: `Clan War League ${moment(body.season).format('MMMM YYYY')}` })
			.setAuthor({ name: 'CWL Roster' })
			.setDescription('CWL Roster and Town-Hall Distribution')
			.setColor(this.client.embed(interaction));

		for (const clan of body.clans) {
			const reduced = clan.members.reduce<{ [key: string]: number }>((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {});

			const townHalls = Object.entries(reduced)
				.map((entry) => ({ level: Number(entry[0]), total: Number(entry[1]) }))
				.sort((a, b) => b.level - a.level);

			detailedEmbed.addFields([
				{
					name: `\u200e${clan.tag === clanTag ? `__${clan.name} (${clan.tag})__` : `${clan.name} (${clan.tag})`}`,
					value: [
						Util.chunk(townHalls, 5)
							.map((chunks) => chunks.map((th) => `${TOWN_HALLS[th.level]} ${WHITE_NUMBERS[th.total]}\u200b`).join(' '))
							.join('\n')
					].join('\n')
				}
			]);
		}

		const embed = args.detailed ? detailedEmbed : summarizedEmbed;

		const payload = {
			cmd: this.id,
			tag: clanTag,
			detailed: args.detailed
		};
		const customIds = {
			toggle: this.createId({ ...payload, detailed: !args.detailed }),
			refresh: this.createId(payload)
		};
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(customIds.refresh).setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(customIds.toggle)
				.setStyle(ButtonStyle.Secondary)
				.setLabel(args.detailed ? 'Summarized Roster' : 'Detailed Roster')
		);
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private getNextRoster(clan: APIWarClan, townHalls: number[]) {
		const roster = this.roster(clan);
		return townHalls.map((th) => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private flat(tag: string, townHalls: number[], body: APIClanWarLeagueGroup) {
		const roster = this.roster(body.clans.find((clan) => clan.tag === tag)!);
		return townHalls.map((th) => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private roster(clan: any) {
		return clan.members.reduce(
			(count: any, member: any) => {
				const townHall = member.townHallLevel || member.townhallLevel;
				count[townHall] = ((count[townHall] as number) || 0) + 1;
				return count;
			},
			{} as { [key: string]: number }
		);
	}

	private winner(clan: APIWarClan, opponent: APIWarClan) {
		return this.client.http.isWinner(clan, opponent);
	}
}
