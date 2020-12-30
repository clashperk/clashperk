import { ClanWarClan, ClanWarOpponent } from 'clashofclans.js';

export interface HitRate {
	townHall: number;
	attacks: number;
	defTownHall: number;
	stars: number;
	hitrate: string;
}

export interface HitRateData {
	clan: { hitrate: HitRate[] };
	opponent: { hitrate: HitRate[] };
}

export function hitRate(clan: ClanWarClan, opponent: ClanWarOpponent, STAR = 3) {
	const data: HitRateData = {
		clan: { hitrate: [] },
		opponent: { hitrate: [] }
	};

	for (const member of opponent.members) {
		if (member.bestOpponentAttack && member.bestOpponentAttack.stars === STAR) {
			const attackerTag = member.bestOpponentAttack.attackerTag;
			const attacker = clan.members.find(m => m.tag === attackerTag);

			if (attacker) {
				const entry = data.clan.hitrate.find(a => a.townHall === member.townhallLevel && a.defTownHall === attacker.townhallLevel);
				if (entry) {
					entry.stars += 1;
				} else {
					data.clan.hitrate.push({
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
					const entry = data.clan.hitrate.find(a => a.townHall === defender.townhallLevel && a.defTownHall === member.townhallLevel);
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
				const entry = data.opponent.hitrate.find(a => a.townHall === member.townhallLevel && a.defTownHall === attacker.townhallLevel);
				if (entry) {
					entry.stars += 1;
				} else {
					data.opponent.hitrate.push({
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
					const entry = data.opponent.hitrate.find(a => a.townHall === defender.townhallLevel && a.defTownHall === member.townhallLevel);
					if (entry) {
						entry.attacks += 1;
					}
				}
			}
		}
	}


	for (const hit of data.clan.hitrate) {
		if (hit.attacks > 0) data.clan.hitrate.find(a => a.townHall === hit.townHall && a.defTownHall === hit.defTownHall)!.hitrate = ((hit.stars / hit.attacks) * 100).toFixed();
	}

	for (const hit of data.opponent.hitrate) {
		if (hit.attacks > 0) data.opponent.hitrate.find(a => a.townHall === hit.townHall && a.defTownHall === hit.defTownHall)!.hitrate = ((hit.stars / hit.attacks) * 100).toFixed();
	}

	data.clan.hitrate.sort((a, b) => b.defTownHall - a.defTownHall).sort((a, b) => b.townHall - a.townHall);
	data.opponent.hitrate.sort((a, b) => b.defTownHall - a.defTownHall).sort((a, b) => b.townHall - a.townHall);
	return data;
}
