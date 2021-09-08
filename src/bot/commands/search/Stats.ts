import { BLUE_NUMBERS, ORANGE_NUMBERS } from '../../util/NumEmojis';
import { Collections } from '../../util/Constants';
import { Argument, Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { Clan, WarClan } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Util } from '../../util/Util';
import moment from 'moment';

export type Comapre = 'all' | 'equal' | { attackerTownHall: number; defenderTownHall: number };
export type WarType = 'regular' | 'cwl' | 'friendly' | 'noFriendly' | 'noCWL' | 'all';
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
			aliases: ['stats'],
			category: 'search',
			channel: 'guild',
			description: {
				content: 'War attack success and defense failure rates.'
			},
			optionFlags: ['--tag', '--compare', '--type', '--stars', '--season'],
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public *args(msg: Message): unknown {
		const mode = yield {
			'default': 'attacks',
			'type': ['attacks', 'defense']
		};

		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		const compare = yield {
			match: 'option',
			flag: '--compare',
			type: Argument.union(
				[['all'], ['equal']],
				(msg: Message, text: string) => {
					if (!text) return 'all';
					if (!/^\d{1,2}(vs?|\s+)\d{1,2}$/i.test(text)) return 'all';
					const match = /^(?<attackerTownHall>\d{1,2})(vs?|\s+)(?<defenderTownHall>\d{1,2})$/i.exec(text);
					const attackerTownHall = Number(match?.groups?.attackerTownHall);
					const defenderTownHall = Number(match?.groups?.defenderTownHall);
					if (!(attackerTownHall > 1 && attackerTownHall < 15 && defenderTownHall > 1 && defenderTownHall < 15)) return 'all';
					return { attackerTownHall, defenderTownHall };
				}
			)
		};

		const stars = yield {
			'default': 3,
			'type': 'number',
			'match': 'option',
			'flag': '--stars'
		};

		const type = yield {
			'flag': '--type',
			'type': 'string',
			'match': 'option',
			'default': 'noFriendly'
		};

		const season = yield {
			'match': 'option',
			'flag': '--season',
			'default': Util.getLastSeasonId(),
			'type': [...Util.getSeasonIds()]
		};

		return { mode, data, compare, type, stars, season };
	}

	public async exec(message: Message, { mode, data, compare, type, stars, season }: { mode: Mode; data: Clan; compare: Comapre; type: WarType; stars: number; season: string }) {
		const extra = type === 'regular'
			? { isFriendly: false, groupWar: false }
			: type === 'cwl'
				? { groupWar: true }
				: type === 'friendly'
					? { isFriendly: true }
					: type === 'noFriendly'
						? { isFriendly: false }
						: type === 'noCWL'
							? { groupWar: false }
							: {};

		const wars = await this.client.db.collection(Collections.CLAN_WARS)
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
			for (const m of clan.members) {
				if (typeof compare === 'object' && compare.attackerTownHall !== m.townhallLevel) continue;
				const member = members[m.tag] // eslint-disable-line
					? members[m.tag]
					: members[m.tag] = {
						name: m.name,
						tag: m.tag,
						total: 0,
						success: 0,
						hall: m.townhallLevel
					};
				member.total += war.groupWar ? 1 : mode === 'defense' ? 1 : 2;

				for (const attack of (mode === 'attacks') ? (m.attacks ?? []) : []) {
					if (typeof compare === 'string' && compare === 'equal') {
						const defender = opponent.members.find(m => m.tag === attack.defenderTag)!;
						if (attack.stars === stars && defender.townhallLevel === m.townhallLevel) member.success += 1;
					} else if (typeof compare === 'object') {
						const { attackerTownHall, defenderTownHall } = compare;
						if (attack.stars === stars && m.townhallLevel === attackerTownHall) {
							const defender = opponent.members.find(m => m.tag === attack.defenderTag)!;
							if (defender.townhallLevel === defenderTownHall) member.success += 1;
						}
					} else if (attack.stars === stars) {
						member.success += 1;
					}
				}

				if (m.bestOpponentAttack && mode === 'defense') {
					const attack = m.bestOpponentAttack;
					if (typeof compare === 'string' && compare === 'equal') {
						const attacker = opponent.members.find(m => m.tag === attack.attackerTag)!;
						if (attack.stars === stars && attacker.townhallLevel === m.townhallLevel) member.success += 1;
					} else if (typeof compare === 'object') {
						const { attackerTownHall, defenderTownHall } = compare;
						if (attack.stars === stars && m.townhallLevel === defenderTownHall) {
							const attacker = opponent.members.find(m => m.tag === attack.attackerTag)!;
							if (attacker.townhallLevel === attackerTownHall) member.success += 1;
						}
					} else if (attack.stars === stars) {
						member.success += 1;
					}
				}
			}
		}

		const clanMemberTags = data.memberList.map(m => m.tag);
		const stats = Object.values(members)
			.filter(m => clanMemberTags.includes(m.tag))
			.map(mem => ({ ...mem, rate: (mem.success * 100) / mem.total }))
			.sort((a, b) => b.rate - a.rate);
		if (!stats.length) {
			return message.util!.send('**No stats are avaliable for this filter or clan.**');
		}

		const hall = typeof compare === 'object'
			? `TH ${Object.values(compare).join('vs')}`
			: `${compare.replace('all', 'All').replace('equal', 'Equal')} TH`;

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setDescription(
				Util.splitMessage(
					[
						`**${hall}, ${stars} Star ${mode === 'attacks' ? 'Attack Success' : 'Defense Failure'} Rates**`,
						'',
						`${EMOJIS.HASH} ${EMOJIS.TOWNHALL} \`RATE%  HITS   ${'NAME'.padEnd(15, ' ')}\u200f\``,
						stats.map(
							(m, i) => {
								const percentage = this._padStart(m.rate.toFixed(1), 5);
								return `\u200e${BLUE_NUMBERS[++i]} ${ORANGE_NUMBERS[m.hall]} \`${percentage} ${this._padStart(m.success, 3)}/${this._padEnd(m.total, 3)} ${this._padEnd(m.name, 14)} \u200f\``;
							}
						).join('\n')
					].join('\n'),
					{ maxLength: 4096 }
				)[0]
			)
			.setFooter(`War Types: ${WarTypes[type]} (Since ${moment(season).format('MMM YYYY')})`);

		return message.util!.send({ embeds: [embed] });
	}

	private _padEnd(num: number | string, maxLength: number) {
		return num.toString().padEnd(maxLength, ' ');
	}

	private _padStart(num: number | string, maxLength: number) {
		return num.toString().padStart(maxLength, ' ');
	}
}
