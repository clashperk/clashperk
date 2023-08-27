import { APIClanWarAttack, APIWarClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import { Collections, MAX_TOWN_HALL_LEVEL, WarType } from '../../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS, ORANGE_NUMBERS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export type Compare = 'all' | 'equal' | { attackerTownHall: number; defenderTownHall: number };
export type WarTypeArg = 'regular' | 'cwl' | 'friendly' | 'noFriendly' | 'noCWL' | 'all';
export type Mode = 'attacks' | 'defense';

const WarTypes = {
	regular: 'Regular',
	cwl: 'CWL',
	friendly: 'Friendly',
	noFriendly: 'Regular and CWL',
	noCWL: 'Regular and Friendly',
	all: 'Regular, CWL and Friendly'
};

export default class StatsCommand extends Command {
	public constructor() {
		super('stats', {
			category: 'search',
			channel: 'guild',
			description: {
				content: 'War attack success and defense failure rates.'
			},
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public args(): Args {
		return {
			stars: {
				match: 'STRING',
				default: '==3'
			},
			type: {
				match: 'STRING',
				default: 'noFriendly'
			},
			season: {
				match: 'ENUM',
				enums: Util.getSeasonIds(),
				default: Util.getLastSeasonId()
			},
			compare: {
				match: 'STRING'
			}
		};
	}

	private compare(value: string): Compare {
		if (!value) return 'all';
		if (value === 'equal') return 'equal';
		if (!/^\d{1,2}(vs?|\s+)\d{1,2}$/i.test(value)) return 'all';
		const match = /^(?<attackerTownHall>\d{1,2})(vs?|\s+)(?<defenderTownHall>\d{1,2})$/i.exec(value);
		const attackerTownHall = Number(match?.groups?.attackerTownHall);
		const defenderTownHall = Number(match?.groups?.defenderTownHall);
		if (
			!(
				attackerTownHall > 1 &&
				attackerTownHall <= MAX_TOWN_HALL_LEVEL &&
				defenderTownHall > 1 &&
				defenderTownHall <= MAX_TOWN_HALL_LEVEL
			)
		)
			return 'all';
		return { attackerTownHall, defenderTownHall };
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: {
			command: Mode;
			tag?: string;
			compare: string | Compare;
			type?: WarTypeArg;
			stars: string;
			season: string;
			attempt?: string;
			user?: User;
			days?: number;
			wars?: number;
			view?: 'starsAvg' | 'hitRates';
		}
	) {
		const stars = args.view === 'starsAvg' ? '>=1' : args.stars || '==3';
		let season = args.season || Util.getLastSeasonId();
		const type = args.type ?? 'noFriendly';
		const attempt = args.attempt;
		const compare = this.compare(args.compare as string);
		const mode = args.command || 'attacks'; // eslint-disable-line

		const data = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!data) return;

		const extra =
			type === 'regular'
				? { warType: WarType.REGULAR }
				: type === 'cwl'
				? { warType: WarType.CWL }
				: type === 'friendly'
				? { warType: WarType.FRIENDLY }
				: type === 'noFriendly'
				? { warType: { $ne: WarType.FRIENDLY } }
				: type === 'noCWL'
				? { warType: { $ne: WarType.CWL } }
				: {};
		if (args.days && args.days >= 1) season = moment().subtract(args.days, 'days').format('YYYY-MM-DD');
		const filters = args.wars && args.wars >= 1 ? {} : { preparationStartTime: { $gte: new Date(season) } };

		const cursor = this.client.db.collection(Collections.CLAN_WARS).find({
			// $or: [{ 'clan.tag': data.tag }, { 'opponent.tag': data.tag }],
			$or: [
				{
					'clan.members.tag': {
						$in: data.memberList.map((m) => m.tag)
					}
				},
				{
					'opponent.members.tag': {
						$in: data.memberList.map((m) => m.tag)
					}
				}
			],
			...filters,
			...extra
		});
		cursor.sort({ _id: -1 });
		if (args.wars && args.wars >= 1) cursor.limit(args.wars);

		const wars = await cursor.toArray();
		const members: Record<
			string,
			{ name: string; tag: string; total: number; success: number; hall: number; attacks: number; stars: number }
		> = {};
		for (const war of wars) {
			const clan: APIWarClan = war.clan.tag === data.tag ? war.clan : war.opponent;
			const opponent: APIWarClan = war.clan.tag === data.tag ? war.opponent : war.clan;
			const attacks = (mode === 'attacks' ? clan : opponent).members
				.filter((m) => m.attacks?.length)
				.map((m) => m.attacks!)
				.flat();
			for (const m of clan.members) {
				if (typeof compare === 'object' && compare.attackerTownHall !== m.townhallLevel) continue;
				const clanMember = data.memberList.find((mem) => mem.tag === m.tag);
				// eslint-disable-next-line
				members[m.tag] ??= {
					name: clanMember?.name ?? m.name,
					tag: m.tag,
					total: 0,
					success: 0,
					attacks: 0,
					stars: 0,
					hall: m.townhallLevel
				};
				const member = members[m.tag];

				for (const attack of mode === 'attacks' ? m.attacks ?? [] : []) {
					member.attacks += 1;
					member.stars += attack.stars;

					if (attempt === 'fresh' && !this._isFreshAttack(attacks, attack.defenderTag, attack.order)) continue;
					if (attempt === 'cleanup' && this._isFreshAttack(attacks, attack.defenderTag, attack.order)) continue;

					if (typeof compare === 'string' && compare === 'equal') {
						const defender = opponent.members.find((m) => m.tag === attack.defenderTag)!;
						if (defender.townhallLevel === m.townhallLevel) {
							member.total += 1;
							if (this.getStars(attack.stars, stars)) member.success += 1;
						}
					} else if (typeof compare === 'object') {
						const { attackerTownHall, defenderTownHall } = compare;
						if (m.townhallLevel === attackerTownHall) {
							const defender = opponent.members.find((m) => m.tag === attack.defenderTag)!;
							if (defender.townhallLevel === defenderTownHall) {
								member.total += 1;
								if (this.getStars(attack.stars, stars)) member.success += 1;
							}
						}
					} else {
						member.total += 1;
						if (this.getStars(attack.stars, stars)) member.success += 1;
					}
				}

				for (const _attack of m.bestOpponentAttack && mode === 'defense' ? [m.bestOpponentAttack] : []) {
					const attack =
						m.opponentAttacks > 1 && attempt === 'fresh'
							? attacks.filter((atk) => atk.defenderTag === _attack.defenderTag).sort((a, b) => a.order - b.order)[0]!
							: attacks
									.filter((atk) => atk.defenderTag === _attack.defenderTag)
									.sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)[0]!;

					const isFresh = this._isFreshAttack(attacks, attack.defenderTag, attack.order);
					if (attempt === 'cleanup' && isFresh) continue;
					if (attempt === 'fresh' && !isFresh) continue;

					if (typeof compare === 'string' && compare === 'equal') {
						const attacker = opponent.members.find((m) => m.tag === attack.attackerTag)!;
						if (attacker.townhallLevel === m.townhallLevel) {
							member.total += 1;
							if (this.getStars(attack.stars, stars)) member.success += 1;
						}
					} else if (typeof compare === 'object') {
						const { attackerTownHall, defenderTownHall } = compare;
						if (m.townhallLevel === defenderTownHall) {
							const attacker = opponent.members.find((m) => m.tag === attack.attackerTag)!;
							if (attacker.townhallLevel === attackerTownHall) {
								member.total += 1;
								if (this.getStars(attack.stars, stars)) member.success += 1;
							}
						}
					} else {
						member.total += 1;
						if (this.getStars(attack.stars, stars)) member.success += 1;
					}
				}
			}
		}

		const clanMemberTags = data.memberList.map((m) => m.tag);
		const stats = Object.values(members)
			.filter((m) => m.total > 0 && clanMemberTags.includes(m.tag) && (attempt ? m.success > 0 : true))
			.map((mem) => ({ ...mem, rate: (mem.success * 100) / mem.total }))
			.sort((a, b) => b.success - a.success)
			.sort((a, b) => b.rate - a.rate);
		if (!stats.length) {
			return interaction.editReply(this.i18n('command.stats.no_stats', { lng: interaction.locale }));
		}

		const hall =
			typeof compare === 'object'
				? `TH ${Object.values(compare).join('vs')}`
				: `${compare.replace(/\b(\w)/g, (char) => char.toUpperCase())} TH`;
		const tail = attempt ? `% (${attempt.replace(/\b(\w)/g, (char) => char.toUpperCase())})` : 'Rates';
		const starType = `${stars.startsWith('>') ? '>= ' : ''}${stars.replace(/[>=]+/, '')}`;

		const embed = new EmbedBuilder().setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.small }).setDescription(
			Util.splitMessage(
				[
					`**${hall}, ${starType} Star ${mode === 'attacks' ? 'Attack Success' : 'Defense Failure'} ${tail}**`,
					'',
					`${EMOJIS.HASH}${EMOJIS.TOWN_HALL} \`RATE%  HITS  ${'NAME'.padEnd(15, ' ')}\u200f\``,
					stats
						.map((m, i) => {
							const percentage = this._padStart(m.rate.toFixed(1), 5);
							return `\u200e${BLUE_NUMBERS[++i]}${ORANGE_NUMBERS[m.hall]} \`${percentage} ${this._padStart(
								m.success,
								3
							)}/${this._padEnd(m.total, 3)} ${this._padEnd(m.name, 14)} \u200f\``;
						})
						.join('\n')
				].join('\n'),
				{ maxLength: 4096 }
			)[0]
		);

		if (args.days && args.days >= 1) {
			embed.setFooter({ text: `War Type: ${WarTypes[type]}\n(Last ${args.days} days, ${wars.length} wars)` });
		} else if (args.wars && args.wars >= 1) {
			embed.setFooter({ text: `War Type: ${WarTypes[type]}\n(Last ${wars.length} wars)` });
		} else {
			embed.setFooter({ text: `War Type: ${WarTypes[type]}\n(Since ${moment(season).format('MMM YYYY')}, ${wars.length} wars)` });
		}

		if (args.view === 'starsAvg') {
			stats
				.sort((a, b) => b.total - a.total)
				.sort((a, b) => b.stars - a.stars)
				.sort((a, b) => b.rate - a.rate);

			embed.setDescription(
				Util.splitMessage(
					[
						`**${hall}, ${starType} Star ${mode === 'attacks' ? 'Attack Success' : 'Defense Failure'} ${tail}**`,
						'',
						`\u200e${EMOJIS.HASH}\`STAR AVG RATE%  ${'NAME'.padEnd(15, ' ')}\u200f\``,
						stats
							.map((m, i) => {
								const percentage = this._padStart(this.percentage(m.rate), 5);
								const stars = this._padStart(m.stars.toFixed(0), 3);
								const avg = this._padStart(this.percentage(m.stars / m.attacks), 4);
								return `\u200e${BLUE_NUMBERS[++i]}\`${stars} ${avg} ${percentage}  ${this._padEnd(m.name, 14)} \u200f\``;
							})
							.join('\n')
					].join('\n'),
					{ maxLength: 4096 }
				)[0]
			);
		}
		embed.setTimestamp();

		const payload = {
			cmd: this.id,
			uuid: interaction.id,
			...args,
			view: args.view
		};

		const customIds = {
			refresh: this.createId(payload),
			toggle: this.createId({ ...payload, view: args.view === 'starsAvg' ? 'hitRates' : 'starsAvg' })
		};

		const refreshButton = new ButtonBuilder().setCustomId(customIds.refresh).setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.REFRESH);
		const toggleButton = new ButtonBuilder()
			.setCustomId(customIds.toggle)
			.setStyle(ButtonStyle.Primary)
			.setLabel(args.view === 'starsAvg' ? 'Hit Rates' : 'Avg. Stars')
			.setEmoji(args.view === 'starsAvg' ? EMOJIS.FIRE : EMOJIS.STAR);

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(refreshButton, toggleButton);
		await interaction.editReply({ embeds: [embed], components: [row] });
		return this.clearId(interaction);
	}

	private percentage(num: number) {
		return num === 100 ? '100' : num.toFixed(1);
	}

	private getStars(earned: number, stars: string) {
		switch (stars) {
			case '==1':
				return earned === 1;
			case '==2':
				return earned === 2;
			case '==3':
				return earned === 3;
			case '>=2':
				return earned >= 2;
			case '>=1':
				return earned >= 1;
			default:
				return earned === 3;
		}
	}

	private _padEnd(num: number | string, maxLength: number) {
		return Util.escapeBackTick(num.toString()).padEnd(maxLength, ' ');
	}

	private _padStart(num: number | string, maxLength: number) {
		return num.toString().padStart(maxLength, ' ');
	}

	private _isFreshAttack(attacks: APIClanWarAttack[], defenderTag: string, order: number) {
		const hits = attacks.filter((atk) => atk.defenderTag === defenderTag).sort((a, b) => a.order - b.order);
		return hits.length === 1 || hits[0]!.order === order;
	}
}
