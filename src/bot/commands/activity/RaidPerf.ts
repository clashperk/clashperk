import { Clan } from 'clashofclans.js';
import { CommandInteraction, User } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { RaidSeason } from '../../struct/Http.js';

export default class CapitalRaidsCommand extends Command {
	public constructor() {
		super('raid-perf', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public args(): Args {
		return {
			clan_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; week?: string; card?: boolean; user?: User; player_tag?: string }
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const raid = await this.getRaidsFromAPI(clan);
		if (!raid) return interaction.editReply('No raids found for this clan.');

		console.log('actual reward', raid.defensiveReward);

		await this._predict_defense_reward(raid);

		// return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async getRaidsFromAPI(clan: Clan) {
		const res = await this.client.http.getRaidSeason(clan);
		if (!res.ok) return null;
		if (!res.items.length) return null;
		const data = res.items[0];
		if (!data?.members?.length) return null; // eslint-disable-line
		return data;
	}

	public housing_space(clan: Clan) {
		let space = 0;
		for (const district of clan.clanCapital?.districts ?? []) {
			if (district.id === 70000001) {
				space += 3 * (25 + 5 * district.districtHallLevel);
			} else if (district.id === 70000002 && district.districtHallLevel > 1) {
				space += 25 + 5 * district.districtHallLevel;
			} else if (district.id === 70000005) {
				space += 25 + 5 * district.districtHallLevel;
			}
		}
		return space;
	}

	public async _predict_defense_reward(raid: RaidSeason) {
		const clans = new Map();
		for (const opponent of raid.defenseLog) {
			const opponent_clan = await this.client.http.clan(opponent.attacker.tag);
			clans.set(opponent.attacker.tag, opponent_clan);
		}

		Array(300)
			.fill(0)
			.forEach((_, i) => {
				const district_weights: Record<string, number> = {};
				for (const opponent of raid.defenseLog) {
					for (const district of opponent.districts) {
						if (district.destructionPercent === 100) {
							// eslint-disable-next-line
							district_weights[district.id] = Math.max(district.totalLooted - i, district_weights[district.id] ?? 0);
						}
					}
				}
				const troops_killed = [];
				for (const opponent of raid.defenseLog) {
					const opponent_clan = clans.get(opponent.attacker.tag)!;
					troops_killed.push(0);
					for (const district of opponent.districts) {
						troops_killed[troops_killed.length - 1] += district.attackCount * this.housing_space(opponent_clan);
						if (district.destructionPercent === 100) {
							troops_killed[troops_killed.length - 1] -= district.totalLooted - district_weights[district.id];
						}
					}
				}
				const predicted = Math.floor(Math.max(...troops_killed) / 25);
				console.log(i, ' => ', predicted);
			});
	}
}
