import { CommandInteraction, MessageEmbed } from 'discord.js';
import { ClanWarAttack, WarClan } from 'clashofclans.js';
import moment from 'moment';
import { BLUE_NUMBERS, ORANGE_NUMBERS, EMOJIS } from '../../util/Emojis';
import { Collections, WarType } from '../../util/Constants';
import { Args, Command } from '../../lib';
import { Util } from '../../util';

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
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
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
		if (!(attackerTownHall > 1 && attackerTownHall < 15 && defenderTownHall > 1 && defenderTownHall < 15)) return 'all';
		return { attackerTownHall, defenderTownHall };
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		{
			command: mode,
			tag,
			compare,
			type,
			stars,
			season,
			attempt
		}: { command: Mode; tag?: string; compare: string | Compare; type: WarTypeArg; stars: string; season: string; attempt?: string }
	) {
		const data = await this.client.resolver.resolveClan(interaction, tag);
		if (!data) return;

		compare = this.compare(compare as string);
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

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.find({
				$or: [{ 'clan.tag': data.tag }, { 'opponent.tag': data.tag }],
				preparationStartTime: { $gte: new Date(season) },
				...extra
			})
			.toArray();

		const members: { [key: string]: { name: string; tag: string; total: number; success: number; hall: number } } = {};
		for (const war of wars) {
			const clan: WarClan = war.clan.tag === data.tag ? war.clan : war.opponent;
			const opponent: WarClan = war.clan.tag === data.tag ? war.opponent : war.clan;
			const attacks = (mode === 'attacks' ? clan : opponent).members
				.filter((m) => m.attacks?.length)
				.map((m) => m.attacks!)
				.flat();
			for (const m of clan.members) {
				if (typeof compare === 'object' && compare.attackerTownHall !== m.townhallLevel) continue;
				const clanMember = data.memberList.find((mem) => mem.tag === m.tag);
				const member = members[m.tag] // eslint-disable-line
					? members[m.tag]
					: (members[m.tag] = {
							name: clanMember?.name ?? m.name,
							tag: m.tag,
							total: 0,
							success: 0,
							hall: m.townhallLevel
					  });

				for (const attack of mode === 'attacks' ? m.attacks ?? [] : []) {
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
			return interaction.editReply('**No stats are available for this filter or clan.**');
		}

		const hall =
			typeof compare === 'object'
				? `TH ${Object.values(compare).join('vs')}`
				: `${compare.replace(/\b(\w)/g, (char) => char.toUpperCase())} TH`;
		const tail = attempt ? `% (${attempt.replace(/\b(\w)/g, (char) => char.toUpperCase())})` : 'Rates';

		const starType = `${stars.startsWith('>') ? '>= ' : ''}${stars.replace(/[>=]+/, '')}`;
		const embed = new MessageEmbed()
			.setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.small })
			.setDescription(
				Util.splitMessage(
					[
						`**${hall}, ${starType} Star ${mode === 'attacks' ? 'Attack Success' : 'Defense Failure'} ${tail}**`,
						'',
						`${EMOJIS.HASH} ${EMOJIS.TOWNHALL} \`RATE%  HITS   ${'NAME'.padEnd(15, ' ')}\u200f\``,
						stats
							.map((m, i) => {
								const percentage = this._padStart(m.rate.toFixed(1), 5);
								return `\u200e${BLUE_NUMBERS[++i]} ${ORANGE_NUMBERS[m.hall]} \`${percentage} ${this._padStart(
									m.success,
									3
								)}/${this._padEnd(m.total, 3)} ${this._padEnd(m.name, 14)} \u200f\``;
							})
							.join('\n')
					].join('\n'),
					{ maxLength: 4096 }
				)[0]
			)
			.setFooter({ text: `War Types: ${WarTypes[type]} (Since ${moment(season).format('MMM YYYY')})` });

		return interaction.editReply({ embeds: [embed] });
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

	private _isFreshAttack(attacks: ClanWarAttack[], defenderTag: string, order: number) {
		const hits = attacks.filter((atk) => atk.defenderTag === defenderTag).sort((a, b) => a.order - b.order);
		return hits.length === 1 || hits[0]!.order === order;
	}
}
