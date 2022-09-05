import { ClanWar, ClanWarLeagueGroup, WarClan } from 'clashofclans.js';
import { EmbedBuilder, CommandInteraction, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import moment from 'moment';
import { BLUE_NUMBERS, ORANGE_NUMBERS, WHITE_NUMBERS, EMOJIS, TOWN_HALLS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class CWLRosterCommand extends Command {
	public constructor() {
		super('cwl-roster', {
			name: 'roster',
			category: 'war',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'CWL Roster and Town Hall distribution.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const body = await this.client.http.clanWarLeague(clan.tag);
		if (body.statusCode === 504 || body.state === 'notInWar') {
			return interaction.editReply(
				this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		if (!body.ok) {
			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		this.client.storage.pushWarTags(clan.tag, body);
		return this.rounds(interaction, body, clan.tag);
	}

	private async fetch(warTag: string) {
		const data = await this.client.http.clanWarLeagueWar(warTag);
		return { warTag, ...data };
	}

	private async rounds(interaction: CommandInteraction<'cached'>, body: ClanWarLeagueGroup, clanTag: string) {
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
		const wars: (ClanWar & { warTag: string })[] = await Promise.all(warTags.map((warTag) => this.fetch(warTag)));
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

		const embed = new EmbedBuilder().setColor(this.client.embed(interaction)).setDescription(
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

			embed.addFields([
				{
					name: '\u200e',
					value: [
						`**Next War (Round #${next.round + 1})**`,
						`${EMOJIS.HASH} ${townHalls.map((th) => ORANGE_NUMBERS[th]).join('')} **Clan**`,
						`${BLUE_NUMBERS[rank + 1]} ${this.getNextRoster(next.clan, townHalls)} ${next.clan.name}`,
						`${BLUE_NUMBERS[oppRank + 1]} ${this.getNextRoster(next.opponent, townHalls)} ${next.opponent.name}`
					].join('\n')
				}
			]);
		}

		if (next?.round || rounds.length >= 2) {
			embed.addFields([
				{
					name: '\u200b',
					value: `Rank #${rank + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`
				}
			]);
		}

		const customID = this.client.uuid(interaction.user.id);
		const button = new ButtonBuilder().setCustomId(customID).setStyle(ButtonStyle.Secondary).setLabel('Detailed Roster');
		const msg = await interaction.editReply({
			embeds: [embed],
			components: [new ActionRowBuilder<ButtonBuilder>({ components: [button] })]
		});
		const collector = await msg
			.awaitMessageComponent({
				filter: (action) => action.customId === customID && action.user.id === interaction.user.id,
				time: 5 * 60 * 1000
			})
			.catch(() => null);

		this.client.components.delete(customID);
		if (!collector) return;

		embed.data.fields = [];
		embed
			.setFooter({ text: `Clan War League ${moment(body.season).format('MMMM YYYY')}` })
			.setAuthor({ name: 'CWL Roster' })
			.setDescription('CWL Roster and Town-Hall Distribution');

		for (const clan of body.clans) {
			const reduced = clan.members.reduce<{ [key: string]: number }>((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {});

			const townHalls = Object.entries(reduced)
				.map((entry) => ({ level: Number(entry[0]), total: Number(entry[1]) }))
				.sort((a, b) => b.level - a.level);

			embed.addFields([
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

		return interaction.editReply({ embeds: [embed], components: [] });
	}

	private getNextRoster(clan: WarClan, townHalls: number[]) {
		const roster = this.roster(clan);
		return townHalls.map((th) => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private flat(tag: string, townHalls: number[], body: ClanWarLeagueGroup) {
		const roster = this.roster(body.clans.find((clan) => clan.tag === tag)!);
		return townHalls.map((th) => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private roster(clan: any) {
		return clan.members.reduce((count: any, member: any) => {
			const townHall = member.townHallLevel || member.townhallLevel;
			count[townHall] = ((count[townHall] as number) || 0) + 1;
			return count;
		}, {} as { [key: string]: number });
	}

	private winner(clan: WarClan, opponent: WarClan) {
		if (clan.stars > opponent.stars) {
			return true;
		} else if (clan.stars < opponent.stars) {
			return false;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return true;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return false;
		}
		return false;
	}
}
