import { BLUE_NUMBERS, ORANGE_NUMBERS } from '../../util/NumEmojis';
import { Collections } from '../../util/Constants';
import { Argument, Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { Clan, WarClan } from 'clashofclans.js';
import { Season, Util } from '../../util/Util';
import { EMOJIS } from '../../util/Emojis';
import moment from 'moment';

export type Comapre = 'all' | 'equal' | { attackerTownHall: number; defenderTownHall: number };
export type WarType = 'regular' | 'cwl' | 'all';
export type Mode = 'attacks' | 'defense';

export default class StatsCommand extends Command {
	public constructor() {
		super('stats', {
			aliases: ['stats'],
			category: 'search',
			channel: 'guild',
			description: {
				content: 'Shows war statistics with many filters.'
			},
			optionFlags: ['--tag', '--compare', '--type', '--min-stars', '--season'],
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

		const minStars = yield {
			'default': 1,
			'type': 'number',
			'match': 'option',
			'flag': '--min-stars'
		};

		const type = yield {
			'flag': '--type',
			'type': 'string',
			'match': 'option',
			'default': 'all'
		};

		const season = yield {
			'match': 'option',
			'flag': '--season',
			'default': Season.ID,
			'type': [...Util.getSeasonIds(), [Util.getLastSeasonId(), 'last']]
		};

		return { mode, data, compare, type, minStars, season };
	}

	public async exec(message: Message, { mode, data, compare, type, minStars, season }: { mode: Mode; data: Clan; compare: Comapre; type: WarType; minStars: number; season: string }) {
		const extra = type === 'all' ? {} : { groupWar: type === 'cwl' };
		const wars = await this.client.db.collection(Collections.CLAN_WARS)
			.find({
				$or: [{ 'clan.tag': data.tag }, { 'opponent.tag': data.tag }],
				preparationStartTime: { $gte: new Date(season) },
				...extra
			})
			.toArray();

		const days = moment.duration(Math.max(24 * 60 * 60 * 1000, Date.now() - new Date(season).getTime()))
			.format('D[d]', { trim: 'both mid' });
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
						if (attack.stars >= minStars && defender.townhallLevel === m.townhallLevel) member.success += 1;
					} else if (typeof compare === 'object') {
						const { attackerTownHall, defenderTownHall } = compare;
						if (attack.stars >= minStars && m.townhallLevel === attackerTownHall) {
							const defender = opponent.members.find(m => m.tag === attack.defenderTag)!;
							if (defender.townhallLevel === defenderTownHall) member.success += 1;
						}
					} else if (attack.stars >= minStars) {
						member.success += 1;
					}
				}

				if (m.bestOpponentAttack && mode === 'defense') {
					const attack = m.bestOpponentAttack;
					if (typeof compare === 'string' && compare === 'equal') {
						const attacker = opponent.members.find(m => m.tag === attack.attackerTag)!;
						if (attack.stars >= minStars && attacker.townhallLevel === m.townhallLevel) member.success += 1;
					} else if (typeof compare === 'object') {
						const { attackerTownHall, defenderTownHall } = compare;
						if (attack.stars >= minStars && m.townhallLevel === defenderTownHall) {
							const attacker = opponent.members.find(m => m.tag === attack.attackerTag)!;
							if (attacker.townhallLevel === attackerTownHall) member.success += 1;
						}
					} else if (attack.stars >= minStars) {
						member.success += 1;
					}
				}
			}
		}

		const clanMemberTags = data.memberList.map(m => m.tag);
		const stats = Object.values(members).filter(m => clanMemberTags.includes(m.tag));
		if (!stats.length) {
			return message.util!.send('No stats are avaliable for this filter or clan.');
		}

		const hall = typeof compare === 'object'
			? Object.values(compare).join('vs')
			: compare;

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} War Stats (Last ${days} Days)`)
			.setDescription([
				`${EMOJIS.HASH} ${EMOJIS.TOWNHALL} \`RATE%  HITS   ${'NAME'.padEnd(15, ' ')}\u200f\``,
				stats.map(
					(m, i) => `${BLUE_NUMBERS[++i]} ${ORANGE_NUMBERS[m.hall]} \`${Math.floor((m.success * 100) / m.total).toFixed(1).padStart(5, ' ')} ${m.success.toString().padStart(3, ' ')}/${m.total.toString().padEnd(3, ' ')} ${m.name.padEnd(15, ' ')}\u200f\``
				).join('\n')
			].join('\n'))
			.setFooter(`townhall: ${hall}, min-stars: ${minStars}, ${mode} stats, ${type} wars`);

		return message.util!.send({ embeds: [embed] });
	}
}
