import { BUILDER_TROOPS, EMOJIS, HOME_TROOPS } from '../../util/Emojis';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { MessageEmbed, Message } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { TroopJSON } from '../../util/Constants';
import { Player } from 'clashofclans.js';
import ms from 'ms';

export default class UpgradesCommand extends Command {
	public constructor() {
		super('upgrades', {
			aliases: ['upgrade', 'upgrades', 'ug'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Remaining upgrades of troops, spells and heroes.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			optionFlags: ['--tag', '--base']
		});
	}

	public *args(msg: Message): unknown {
		const base = yield {
			flag: '--base',
			unordered: true,
			type: Argument.range('integer', 1, 25),
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: true,
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: async (msg: Message, args: string) => this.client.resolver.resolvePlayer(msg, args, base ?? 1)
		};

		return { data };
	}

	public exec(message: Message, { data }: { data: Player }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`)
			.setDescription(`Remaining upgrades at TH${data.townHallLevel} ${data.builderHallLevel ? `& BH${data.builderHallLevel}` : ''}`);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			})
			.reduce((prev, curr) => {
				if (!(curr.unlock.building in prev)) prev[curr.unlock.building] = [];
				prev[curr.unlock.building].push(curr);
				return prev;
			}, {} as TroopJSON);

		const titles: { [key: string]: string } = {
			'Barracks': `${EMOJIS.ELIXIER} Elixir Troops`,
			'Dark Barracks': `${EMOJIS.DARK_ELIXIR} Dark Troops`,
			'Spell Factory': `${EMOJIS.ELIXIER} Elixir Spells`,
			'Dark Spell Factory': `${EMOJIS.DARK_ELIXIR} Dark Spells`,
			'Town Hall': `${EMOJIS.DARK_ELIXIR} Heroes`,
			'Pet House': `${EMOJIS.DARK_ELIXIR} Pets`,
			'Workshop': `${EMOJIS.ELIXIER} Siege Machines`,
			'Builder Hall': `${EMOJIS.BUILDER_ELIXIR} Builder Base Hero`,
			'Builder Barracks': `${EMOJIS.BUILDER_ELIXIR} Builder Troops`
		};

		const units = [];
		const indexes = Object.values(titles);
		for (const [key, value] of Object.entries(Troops)) {
			const title = titles[key];
			units.push({
				index: indexes.indexOf(title),
				title,
				units: value
			});
		}

		for (const category of units.sort((a, b) => a.index - b.index)) {
			const unitsArray = category.units.map(
				unit => {
					const { maxLevel, level } = apiTroops
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

					return {
						type: unit.type,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel! - 1],
						maxLevel,
						resource: unit.upgrade.resource,
						upgradeCost: level ? unit.upgrade.cost[level - 1] : unit.unlock.cost,
						upgradeTime: level ? unit.upgrade.time[level - 1] : unit.unlock.time
					};
				}
			);

			if (unitsArray.length) {
				embed.addField(
					`\u200b\n${category.title}`,
					unitsArray.map(unit => {
						const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
						const level = this.padStart(unit.level);
						const maxLevel = this.padEnd(unit.hallMaxLevel);
						const upgradeTime = ms(unit.upgradeTime * 1000).padStart(5, ' ');
						const upgradeCost = this.format(unit.upgradeCost).padStart(6, ' ');
						return `${unitIcon} \u2002 \`\u200e${level}/${maxLevel}\u200f\` \u2002 \u200e\`${upgradeTime} \u200f\` \u2002 \u200e\` ${upgradeCost} \u200f\``;
					}).join('\n')
				);
			}
		}

		if (!embed.fields.length) {
			embed.setDescription(
				`No remaining upgrades at TH${data.townHallLevel} ${data.builderHallLevel ? ` and BH${data.builderHallLevel}` : ''}`
			);
		}
		return message.util!.send({ embed });
	}

	private padEnd(num: number) {
		return num.toString().padEnd(2, ' ');
	}

	private padStart(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private apiTroops(data: Player) {
		return [
			...data.troops.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'troop',
				village: u.village
			})),
			...data.heroes.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'hero',
				village: u.village
			})),
			...data.spells.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'spell',
				village: u.village
			}))
		];
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e+9

			? `${(Math.abs(num) / 1.0e+9).toFixed(2)}B`
			// Six Zeroes for Millions
			: Math.abs(num) >= 1.0e+6

				? `${(Math.abs(num) / 1.0e+6).toFixed(2)}M`
				// Three Zeroes for Thousands
				: Math.abs(num) >= 1.0e+3

					? `${(Math.abs(num) / 1.0e+3).toFixed(1)}K`

					: Math.abs(num).toFixed(0);
	}
}
