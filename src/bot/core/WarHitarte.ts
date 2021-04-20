import { ClanWarClan, ClanWarOpponent } from 'clashofclans.js';

export interface Hit {
	townHall: number;
	attacks: number;
	defTownHall: number;
	stars: number;
	rate: number;
}

export interface HitRate {
	clan: { hitRates: Hit[] };
	opponent: { hitRates: Hit[] };
}

export function getHitRate(clan: ClanWarClan, opponent: ClanWarOpponent, stars = 3) {
	const data: HitRate = {
		clan: { hitRates: [] },
		opponent: { hitRates: [] }
	};

	for (const member of opponent.members) {
		if (member.bestOpponentAttack) {
			const attackerTag = member.bestOpponentAttack.attackerTag;
			const attacker = clan.members.find(m => m.tag === attackerTag);
			if (attacker) {
				data.clan.hitRates.push({
					townHall: member.townhallLevel,
					defTownHall: attacker.townhallLevel,
					attacks: 0,
					stars: 0,
					rate: 0
				});

				const entry = data.clan.hitRates.find(
					hit => hit.townHall === member.townhallLevel && hit.defTownHall === attacker.townhallLevel
				);
				if (entry && member.bestOpponentAttack.stars === stars) {
					entry.stars += 1;
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
					const entry = data.clan.hitRates.find(
						hit => hit.townHall === defender.townhallLevel && hit.defTownHall === member.townhallLevel
					);
					if (entry) {
						entry.attacks += 1;
					}
				}
			}
		}
	}

	for (const member of clan.members) {
		if (member.bestOpponentAttack) {
			const attackerTag = member.bestOpponentAttack.attackerTag;
			const attacker = opponent.members.find(m => m.tag === attackerTag);
			if (attacker) {
				data.opponent.hitRates.push({
					townHall: member.townhallLevel,
					defTownHall: attacker.townhallLevel,
					attacks: 0,
					stars: 0,
					rate: 0
				});

				const entry = data.opponent.hitRates.find(
					hit => hit.townHall === member.townhallLevel && hit.defTownHall === attacker.townhallLevel
				);
				if (entry && member.bestOpponentAttack.stars === stars) {
					entry.stars += 1;
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
					const entry = data.opponent.hitRates.find(
						hit => hit.townHall === defender.townhallLevel && hit.defTownHall === member.townhallLevel
					);
					if (entry) {
						entry.attacks += 1;
					}
				}
			}
		}
	}


	for (const hit of data.clan.hitRates) {
		if (hit.attacks > 0) {
			data.clan.hitRates.find(
				a => a.townHall === hit.townHall && a.defTownHall === hit.defTownHall
			)!.rate = ((hit.stars / hit.attacks) * 100);
		}
	}

	for (const hit of data.opponent.hitRates) {
		if (hit.attacks > 0) {
			data.opponent.hitRates.find(
				a => a.townHall === hit.townHall && a.defTownHall === hit.defTownHall
			)!.rate = ((hit.stars / hit.attacks) * 100);
		}
	}

	data.clan.hitRates.sort((a, b) => b.defTownHall - a.defTownHall).sort((a, b) => b.townHall - a.townHall);
	data.opponent.hitRates.sort((a, b) => b.defTownHall - a.defTownHall).sort((a, b) => b.townHall - a.townHall);
	return data;
}

export function parseHits(clan: ClanWarClan, opponent: ClanWarOpponent, stars: number) {
	const hit = getHitRate(clan, opponent, stars);
	const combinations = [...hit.clan.hitRates, ...hit.opponent.hitRates]
		.map(({ townHall, defTownHall }) => ({ townHall, defTownHall }))
		.reduce((previous, current) => {
			const index = previous.findIndex(hit => hit.townHall === current.townHall && hit.defTownHall === current.defTownHall);
			if (index < 0) previous.push(current);
			return previous;
		}, [] as { townHall: number; defTownHall: number }[]);

	const collection = [];
	for (const { townHall, defTownHall } of combinations) {
		const clan = hit.clan.hitRates.find(
			hit => hit.townHall === townHall && hit.defTownHall === defTownHall
		);
		const opponent = hit.opponent.hitRates.find(
			hit => hit.townHall === townHall && hit.defTownHall === defTownHall
		);

		const data = {
			clan: { townHall, defTownHall, stars: 0, attacks: 0, rate: 0 },
			opponent: { townHall, defTownHall, stars: 0, attacks: 0, rate: 0 }
		};

		if (clan) data.clan = clan;
		if (opponent) data.opponent = opponent;

		if (data.clan.stars === 0 && data.opponent.stars === 0) continue;
		collection.push(data);
	}

	return collection;
}
