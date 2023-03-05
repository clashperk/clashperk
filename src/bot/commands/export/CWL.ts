import { ClanWar, ClanWarAttack, ClanWarLeagueGroup, WarClan } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import { Season, Util } from '../../util/index.js';
import { Collections } from '../../util/Constants.js';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default class ExportCWL extends Command {
	public constructor() {
		super('export-cwl', {
			category: 'none',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			description: {
				content: 'Export war stats to excel for all clans.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string }) {
		const season = args.season === Season.ID ? null : args.season;
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const chunks = [];
		for (const clan of clans) {
			const res = season ? null : await this.client.http.clanWarLeague(clan.tag);
			if (!res?.ok || res.state === 'notInWar') {
				const data = await this.client.storage.getWarTags(clan.tag, season);
				if (!data) continue;
				if (args.season && data.season !== args.season) continue;
				const { members, perRound, ranking } = await this.rounds(data, clan, season);
				if (!members.length) continue;

				chunks.push({
					name: clan.name,
					tag: clan.tag,
					members,
					ranking,
					perRound,
					id: `${months[new Date(data.season).getMonth()]} ${new Date(data.season).getFullYear()}`
				});
				continue;
			}

			if (args.season && res.season !== args.season) continue;
			const { members, perRound, ranking } = await this.rounds(res, clan);
			if (!members.length) continue;
			chunks.push({
				name: clan.name,
				tag: clan.tag,
				members,
				perRound,
				ranking,
				id: `${months[new Date().getMonth()]} ${new Date().getFullYear()}`
			});
		}

		if (!chunks.length) {
			return interaction.editReply(this.i18n('command.cwl.no_season_data', { lng: interaction.locale, season: season ?? Season.ID }));
		}

		const workbook = new Excel();
		for (const { members, name, tag, id } of chunks) {
			const sheet = workbook.addWorksheet(`${Util.escapeSheetName(name)}_${tag}_${id}`.substring(0, 31));
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Total Attacks', width: 8 },
				{ header: 'Total Stars', width: 8 },
				{ header: 'Avg. Total Stars', width: 8 },
				{ header: 'True Stars', width: 8 },
				{ header: 'Avg. True Stars', width: 8 },
				{ header: 'Total Dest', width: 8 },
				{ header: 'Avg Dest', width: 8 },
				{ header: 'Three Stars', width: 8 },
				{ header: 'Two Stars', width: 8 },
				{ header: 'One Stars', width: 8 },
				{ header: 'Zero Stars', width: 8 },
				{ header: 'Missed', width: 8 },
				{ header: 'Def Stars', width: 8 },
				{ header: 'Avg Def Stars', width: 8 },
				{ header: 'Total Def Dest', width: 8 },
				{ header: 'Avg Def Dest', width: 8 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(
				members
					.filter((m) => m.of > 0)
					.map((m) => [
						m.name,
						m.tag,
						m.of,
						m.stars,
						(m.stars / m.of).toFixed(2),
						m.trueStars,
						(m.trueStars / m.of).toFixed(2),
						m.dest.toFixed(2),
						(m.dest / m.of).toFixed(2),
						this.starCount(m.starTypes, 3),
						this.starCount(m.starTypes, 2),
						this.starCount(m.starTypes, 1),
						this.starCount(m.starTypes, 0),
						m.of - m.attacks,
						m.defStars,
						(m.defStars / m.defCount).toFixed(),
						m.defDestruction.toFixed(2),
						(m.defDestruction / m.defCount).toFixed(2)
					])
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return interaction.editReply({
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_war_league_stats.xlsx'
				},
				{
					attachment: Buffer.from(await this.perRoundStats(chunks).xlsx.writeBuffer()),
					name: 'clan_war_league_per_round_stats.xlsx'
				},
				{
					attachment: Buffer.from(await this.finalStandings(chunks).xlsx.writeBuffer()),
					name: 'clan_war_league_final_standings.xlsx'
				}
			]
		});
	}

	private finalStandings(
		clans: {
			perRound: { clan: WarClan; opponent: WarClan }[];
			name: string;
			tag: string;
			ranking: {
				name: string;
				tag: string;
				attacks: number;
				stars: number;
				destruction: number;
			}[];
		}[]
	) {
		const workbook = new Excel();
		for (const { perRound, name, tag, ranking } of clans) {
			const sheet = workbook.addWorksheet(`Ranking (${Util.escapeSheetName(name).concat(tag)})`.substring(0, 31));
			sheet.columns = [
				{ header: 'Rank', width: 8 },
				{ header: 'Clan', width: 18 },
				{ header: 'Tag', width: 18 },
				{ header: 'Attacks', width: 8 },
				{ header: 'Stars', width: 8 },
				{ header: 'Destruction', width: 10 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(ranking.map((r, i) => [i + 1, r.name, r.tag, r.attacks, r.stars, Number(r.destruction.toFixed(2))]));

			if (perRound.length) {
				const sheet = workbook.addWorksheet(`Rounds (${Util.escapeSheetName(name).concat(tag)})`.substring(0, 31));
				sheet.columns = [
					{ header: 'Round', width: 8 },
					{ header: 'Clan', width: 18 },
					{ header: 'ClanTag', width: 18 },
					{ header: 'Attacks', width: 8 },
					{ header: 'Stars', width: 8 },
					{ header: 'Destruction', width: 10 },
					{ header: 'Opponent', width: 18 },
					{ header: 'OpponentTag', width: 18 },
					{ header: 'Attacks', width: 8 },
					{ header: 'Stars', width: 8 },
					{ header: 'Destruction', width: 10 }
				];

				sheet.getRow(1).font = { bold: true, size: 10 };
				sheet.getRow(1).height = 40;

				for (let i = 1; i <= sheet.columns.length; i++) {
					sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
				}
				sheet.addRows(
					perRound.map((r, i) => [
						i + 1,
						r.clan.name,
						r.clan.tag,
						r.clan.attacks,
						r.clan.stars,
						Number(r.clan.destructionPercentage.toFixed(2)),
						r.opponent.name,
						r.opponent.tag,
						r.opponent.attacks,
						r.opponent.stars,
						Number(r.opponent.destructionPercentage.toFixed(2))
					])
				);
			}
		}

		return workbook;
	}

	private perRoundStats(clans: { perRound: { clan: WarClan; opponent: WarClan }[] }[]) {
		const workbook = new Excel();
		for (const { perRound } of clans) {
			let i = 0;
			for (const round of perRound) {
				// eslint-disable-next-line
				const sheet = workbook.addWorksheet(
					`Round ${++i} (${Util.escapeSheetName(round.clan.name).concat(round.clan.tag)})`.substring(0, 31)
				);

				sheet.columns = [
					{ header: 'Clan', width: 18 },
					{ header: 'Opponent', width: 18 },
					{ header: 'Attacker', width: 18 },
					{ header: 'Attacker Tag', width: 13 },
					{ header: 'Stars', width: 8 },
					{ header: 'True Stars', width: 8 },
					{ header: 'Gained', width: 8 },
					{ header: 'Destruction', width: 10 },
					{ header: 'Defender', width: 18 },
					{ header: 'Defender Tag', width: 13 },
					{ header: 'Attacker Map', width: 10 },
					{ header: 'Attacker TH', width: 10 },
					{ header: 'Defender Map', width: 10 },
					{ header: 'Defender TH', width: 10 },
					{ header: 'Defender Stars', width: 10 },
					{ header: 'Defender Destruction', width: 10 }
				];

				sheet.getRow(1).font = { bold: true, size: 10 };
				sheet.getRow(1).height = 40;

				for (let i = 1; i <= sheet.columns.length; i++) {
					sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
				}

				sheet.addRows(
					round.clan.members.map((m) => {
						const opponent = round.opponent.members.find((en) => en.tag === m.attacks?.[0]?.defenderTag);
						const gained = m.bestOpponentAttack && m.attacks?.length ? m.attacks[0].stars - m.bestOpponentAttack.stars : '';
						const __attacks = round.clan.members.flatMap((m) => m.attacks ?? []);

						const previousBestAttack = m.attacks?.length
							? this.getPreviousBestAttack(__attacks, round.opponent, m.attacks[0])
							: null;

						return [
							round.clan.name,
							round.opponent.name,
							m.name,
							m.tag,
							m.attacks?.length ? m.attacks.at(0)!.stars : '',
							previousBestAttack
								? Math.max(m.attacks!.at(0)!.stars - previousBestAttack.stars)
								: m.attacks?.length
								? m.attacks.at(0)!.stars
								: '',
							gained,
							m.attacks?.length ? m.attacks.at(0)!.destructionPercentage.toFixed(2) : '',
							opponent ? opponent.name : '',
							opponent ? opponent.tag : '',
							round.clan.members.findIndex((en) => en.tag === m.tag) + 1,
							m.townhallLevel,
							opponent ? round.opponent.members.findIndex((en) => en.tag === opponent.tag) + 1 : '',
							opponent ? opponent.townhallLevel : '',
							m.bestOpponentAttack?.stars ?? '',
							m.bestOpponentAttack?.destructionPercentage.toFixed(2) ?? ''
						];
					})
				);
			}
		}
		return workbook;
	}

	private starCount(stars = [], count: number) {
		return stars.filter((star) => star === count).length;
	}

	private async rounds(body: ClanWarLeagueGroup, clan: { tag: string }, season?: string | null) {
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
		const clanTag = clan.tag;
		const members: { [key: string]: any } = {};

		const ranking: {
			[key: string]: {
				name: string;
				tag: string;
				stars: number;
				attacks: number;
				destruction: number;
			};
		} = {};

		const perRound = [];
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data = season
					? await this.client.db.collection<ClanWar>(Collections.CLAN_WARS).findOne({ warTag })
					: await this.client.http.clanWarLeagueWar(warTag);
				if (!data) continue;
				if ((!data.ok || data.state === 'notInWar') && !season) continue;

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

				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
					opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

					const __attacks = clan.members.flatMap((m) => m.attacks ?? []);

					if (['inWar', 'warEnded'].includes(data.state)) {
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: (members[m.tag] = {
										name: m.name,
										tag: m.tag,
										of: 0,
										attacks: 0,
										stars: 0,
										trueStars: 0,
										dest: 0,
										defStars: 0,
										defDestruction: 0,
										starTypes: [],
										defCount: 0
								  });
							member.of += 1;

							for (const atk of m.attacks ?? []) {
								const previousBestAttack = this.getPreviousBestAttack(__attacks, opponent, atk);
								member.attacks += 1;
								member.stars += atk.stars;
								member.trueStars += previousBestAttack ? Math.max(0, atk.stars - previousBestAttack.stars) : atk.stars;
								member.dest += atk.destructionPercentage;
								member.starTypes.push(atk.stars);
							}

							if (m.bestOpponentAttack) {
								member.defStars += m.bestOpponentAttack.stars;
								member.defDestruction += m.bestOpponentAttack.destructionPercentage;
								member.defCount += 1;
							}
						}

						perRound.push({ clan, opponent });
					}
					// break;
				}
			}
		}

		return {
			perRound,
			ranking: Object.values(ranking).sort((a, b) => b.stars - a.stars),
			members: Object.values(members)
				.sort((a, b) => b.dest - a.dest)
				.sort((a, b) => b.stars - a.stars)
		};
	}

	private getPreviousBestAttack(attacks: ClanWarAttack[], opponent: WarClan, atk: ClanWarAttack) {
		const defender = opponent.members.find((m) => m.tag === atk.defenderTag)!;
		const defenderDefenses = attacks.filter((atk) => atk.defenderTag === defender.tag);
		const isFresh = defenderDefenses.length === 0 || atk.order === Math.min(...defenderDefenses.map((d) => d.order));
		const previousBestAttack = isFresh
			? null
			: [...attacks]
					.filter((_atk) => _atk.defenderTag === defender.tag && _atk.order < atk.order && _atk.attackerTag !== atk.attackerTag)
					.sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)
					.at(0) ?? null;
		return isFresh ? null : previousBestAttack;
	}
}
