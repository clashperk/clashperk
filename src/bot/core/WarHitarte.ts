import { ClanWarClan, ClanWarOpponent } from 'clashofclans.js';

export interface Hit {
	townHall: number;
	attacks: number;
	defTownHall: number;
	stars: number;
	hitrate: string;
}

export interface HitRate {
	clan: { hitRate: Hit[] };
	opponent: { hitRate: Hit[] };
}

export function getHitRate(clan: ClanWarClan, opponent: ClanWarOpponent, STAR = 3) {
	const data: HitRate = {
		clan: { hitRate: [] },
		opponent: { hitRate: [] }
	};

	for (const member of opponent.members) {
		if (member.bestOpponentAttack && member.bestOpponentAttack.stars === STAR) {
			const attackerTag = member.bestOpponentAttack.attackerTag;
			const attacker = clan.members.find(m => m.tag === attackerTag);

			if (attacker) {
				const entry = data.clan.hitRate.find(a => a.townHall === member.townhallLevel && a.defTownHall === attacker.townhallLevel);
				if (entry) {
					entry.stars += 1;
				} else {
					data.clan.hitRate.push({
						townHall: member.townhallLevel,
						defTownHall: attacker.townhallLevel,
						attacks: 0,
						stars: 1,
						hitrate: '0'
					});
				}
			}
		}
	}

	for (const member of clan.members) {
		if (member.attacks) {
			for (const attack of member.attacks) {
				const attackerTag = attack.defenderTag;
				const defender = opponent.members.find(m => m.tag === attackerTag);
				if (defender) {
					const entry = data.clan.hitRate.find(a => a.townHall === defender.townhallLevel && a.defTownHall === member.townhallLevel);
					if (entry) {
						entry.attacks += 1;
					}
				}
			}
		}
	}

	for (const member of clan.members) {
		if (member.bestOpponentAttack && member.bestOpponentAttack.stars === STAR) {
			const attackerTag = member.bestOpponentAttack.attackerTag;
			const attacker = opponent.members.find(m => m.tag === attackerTag);
			if (attacker) {
				const entry = data.opponent.hitRate.find(a => a.townHall === member.townhallLevel && a.defTownHall === attacker.townhallLevel);
				if (entry) {
					entry.stars += 1;
				} else {
					data.opponent.hitRate.push({
						townHall: member.townhallLevel,
						defTownHall: attacker.townhallLevel,
						attacks: 0,
						stars: 1,
						hitrate: '0'
					});
				}
			}
		}
	}

	for (const member of opponent.members) {
		if (member.attacks) {
			for (const attack of member.attacks) {
				const attacker = attack.defenderTag;
				const defender = clan.members.find(m => m.tag === attacker);
				if (defender) {
					const entry = data.opponent.hitRate.find(a => a.townHall === defender.townhallLevel && a.defTownHall === member.townhallLevel);
					if (entry) {
						entry.attacks += 1;
					}
				}
			}
		}
	}


	for (const hit of data.clan.hitRate) {
		if (hit.attacks > 0) data.clan.hitRate.find(a => a.townHall === hit.townHall && a.defTownHall === hit.defTownHall)!.hitrate = ((hit.stars / hit.attacks) * 100).toFixed();
	}

	for (const hit of data.opponent.hitRate) {
		if (hit.attacks > 0) data.opponent.hitRate.find(a => a.townHall === hit.townHall && a.defTownHall === hit.defTownHall)!.hitrate = ((hit.stars / hit.attacks) * 100).toFixed();
	}

	data.clan.hitRate.sort((a, b) => b.defTownHall - a.defTownHall).sort((a, b) => b.townHall - a.townHall);
	data.opponent.hitRate.sort((a, b) => b.defTownHall - a.defTownHall).sort((a, b) => b.townHall - a.townHall);
	return data;
}

export function parseHits(clan: ClanWarClan, opponent: ClanWarOpponent, stars: number) {
	const hit = getHitRate(clan, opponent, stars);
	const combinations = [...hit.clan.hitRate, ...hit.opponent.hitRate]
		.map(({ townHall, defTownHall }) => ({ townHall, defTownHall }))
		.reduce((a, b) => {
			if (a.findIndex(x => x.townHall === b.townHall && x.defTownHall === b.defTownHall) < 0) a.push(b);
			return a;
		}, [] as { townHall: number; defTownHall: number }[]);

	const collection = [];
	for (const { townHall, defTownHall } of combinations) {
		const clan = hit.clan.hitRate.find(o => o.townHall === townHall && o.defTownHall === defTownHall);
		const opponent = hit.opponent.hitRate.find(o => o.townHall === townHall && o.defTownHall === defTownHall);

		const data = {
			clan: { townHall, defTownHall, stars: 0, attacks: 0, hitrate: '0' },
			opponent: { townHall, defTownHall, stars: 0, attacks: 0, hitrate: '0' }
		};

		if (clan) data.clan = clan;
		if (opponent) data.opponent = opponent;

		collection.push(data);
	}

	return collection;
}
