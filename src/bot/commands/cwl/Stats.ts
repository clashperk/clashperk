import { Clan, ClanWar, ClanWarLeagueGroup, WarClan } from 'clashofclans.js';
import { MessageEmbed, CommandInteraction } from 'discord.js';
import moment from 'moment';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis';
import { Command } from '../../lib';
import { Util } from '../../util';

export default class CWLStatsCommand extends Command {
	public constructor() {
		super('cwl-stats', {
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Ranking and statistics for each round.'
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
			const cw = await this.client.storage.getWarTags(clan.tag);
			if (cw) return this.rounds(interaction, cw, clan);

			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		this.client.storage.pushWarTags(clan.tag, body);
		return this.rounds(interaction, body, clan);
	}

	private async rounds(interaction: CommandInteraction<'cached'>, body: ClanWarLeagueGroup, clan: Clan) {
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
		let [index, stars, destruction] = [0, 0, 0];
		const clanTag = clan.tag;

		const collection: string[][][] = [];
		const members: {
			[key: string]: {
				name: string;
				of: number;
				attacks: number;
				stars: number;
				dest: number;
				lost: number;
			};
		} = {};
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

		for (const data of wars) {
			if (!data.ok || data.state === 'notInWar') continue;

			if (data.state === 'inWar') {
				const clan = ranking[data.clan.tag] // eslint-disable-line
					? ranking[data.clan.tag]
					: (ranking[data.clan.tag] = {
							name: data.clan.name,
							tag: data.clan.tag,
							stars: 0,
							destruction: 0
					  });
				clan.stars += data.clan.stars;
				clan.destruction += data.clan.destructionPercentage * data.teamSize;

				const opponent = ranking[data.opponent.tag] // eslint-disable-line
					? ranking[data.opponent.tag]
					: (ranking[data.opponent.tag] = {
							name: data.opponent.name,
							tag: data.opponent.tag,
							stars: 0,
							destruction: 0
					  });
				opponent.stars += data.opponent.stars;
				opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
			}

			if (data.state === 'warEnded') {
				const clan = ranking[data.clan.tag] //eslint-disable-line
					? ranking[data.clan.tag]
					: (ranking[data.clan.tag] = {
							name: data.clan.name,
							tag: data.clan.tag,
							stars: 0,
							destruction: 0
					  });
				clan.stars += this.winner(data.clan, data.opponent) ? data.clan.stars + 10 : data.clan.stars;
				clan.destruction += data.clan.destructionPercentage * data.teamSize;

				const opponent = ranking[data.opponent.tag] // eslint-disable-line
					? ranking[data.opponent.tag]
					: (ranking[data.opponent.tag] = {
							name: data.opponent.name,
							tag: data.opponent.tag,
							stars: 0,
							destruction: 0
					  });
				opponent.stars += this.winner(data.opponent, data.clan) ? data.opponent.stars + 10 : data.opponent.stars;
				opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
			}

			if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
				const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
				const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
				if (data.state === 'warEnded') {
					stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
					const end = new Date(moment(data.endTime).toDate()).getTime();
					for (const m of clan.members) {
						const member = members[m.tag] // eslint-disable-line
							? members[m.tag]
							: (members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
							  });
						member.of += 1;

						if (m.attacks) {
							member.attacks += 1;
							member.stars += m.attacks[0].stars;
							member.dest += m.attacks[0].destructionPercentage;
						}

						if (m.bestOpponentAttack) {
							member.lost += m.bestOpponentAttack.stars;
						}
					}

					collection.push([
						[
							`${this.winner(clan, opponent) ? EMOJIS.OK : EMOJIS.WRONG} **${clan.name}** vs **${opponent.name}**`,
							`${EMOJIS.CLOCK} [Round ${++index}] Ended ${moment
								.duration(Date.now() - end)
								.format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						],
						[
							`\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(
								opponent.attacks,
								data.teamSize
							).padStart(9, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(
								opponent.destructionPercentage
							).padStart(7, ' ')}\``
						]
					]);
				}
				if (data.state === 'inWar') {
					stars += clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
					const started = new Date(moment(data.startTime).toDate()).getTime();
					for (const m of clan.members) {
						const member = members[m.tag] // eslint-disable-line
							? members[m.tag]
							: (members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
							  });
						member.of += 1;

						if (m.attacks) {
							member.attacks += 1;
							member.stars += m.attacks[0].stars;
							member.dest += m.attacks[0].destructionPercentage;
						}

						if (m.bestOpponentAttack) {
							member.lost += m.bestOpponentAttack.stars;
						}
					}

					collection.push([
						[
							`${EMOJIS.LOADING} **${clan.name}** vs **${opponent.name}**`,
							`${EMOJIS.CLOCK} [Round ${++index}] Started ${moment
								.duration(Date.now() - started)
								.format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						],
						[
							`\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(
								opponent.attacks,
								data.teamSize
							).padStart(9, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(
								opponent.destructionPercentage
							).padStart(7, ' ')}\``
						]
					]);
				}
			}
		}

		if (!collection.length && body.season !== Util.getCWLSeasonId()) {
			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}
		if (!collection.length) return interaction.editReply(this.i18n('command.cwl.no_rounds', { lng: interaction.locale }));
		const description = collection
			.map((arr) => {
				const header = arr[0].join('\n');
				const description = arr[1].join('\n');
				return [header, description].join('\n');
			})
			.join('\n\n');

		const ranks = Object.values(ranking);
		const rank = ranks.sort((a, b) => b.stars - a.stars).findIndex((a) => a.tag === clanTag);

		const padding = Math.max(...ranks.map((r) => r.destruction)) > 9999 ? 6 : 5;
		const embeds = [
			new MessageEmbed()
				.setColor(this.client.embed(interaction))
				.setTitle(`Clan War League Stats (${body.season})`)
				.setDescription(description),

			new MessageEmbed()
				.setColor(this.client.embed(interaction))
				.setTitle('Clan War League Ranking')
				.setDescription(
					[
						`${EMOJIS.HASH} **\`\u200eSTAR DEST%${''.padEnd(padding - 3, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
						ranks
							.sort((a, b) => b.stars - a.stars)
							.map(
								(clan, i) =>
									`${BLUE_NUMBERS[++i]} \`\u200e ${clan.stars.toString().padEnd(3, ' ')} ${this.dest(
										clan.destruction,
										padding
									)}  ${Util.escapeBackTick(clan.name).padEnd(15, ' ')}\``
							)
							.join('\n'),
						'',
						`Rank #${rank + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`
					].join('\n')
				)
		];
		return interaction.editReply({ embeds });
	}

	private async fetch(warTag: string) {
		const data = await this.client.http.clanWarLeagueWar(warTag);
		return { warTag, ...data };
	}

	private dest(dest: number, padding: number) {
		return dest.toFixed().toString().concat('%').padEnd(padding, ' ');
	}

	private destruction(dest: number) {
		return dest.toFixed(2).toString().concat('%');
	}

	private attacks(num: number, team: number) {
		return num.toString().concat(`/${team}`);
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
