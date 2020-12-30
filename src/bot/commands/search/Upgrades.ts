import { BUILDER_TROOPS, HOME_TROOPS } from '../../util/Emojis';
import { TroopInfo, TroopJSON } from '../../util/Constants';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { MessageEmbed, Message } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class UpgradesCommand extends Command {
	public constructor() {
		super('upgrades', {
			aliases: ['upgrade', 'upgrades', 'ug'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Remaining upgrades of troop/spell/hero.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolvePlayer(msg, tag)
				}
			]
		});
	}

	public exec(message: Message, { data }: { data: Player }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setFooter('Remaining Upgrades')
			.setAuthor(
				`${data.name} (${data.tag})`,
				`https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`,
				`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`
			);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			})
			.reduce((prev, curr) => {
				if (!(curr.productionBuilding in prev)) prev[curr.productionBuilding] = [];
				prev[curr.productionBuilding].push(curr);
				return prev;
			}, {} as TroopJSON);

		const titles: { [key: string]: string } = {
			'Barracks': 'Elixir Troops',
			'Dark Barracks': 'Dark Troops',
			'Spell Factory': 'Elixir Spells',
			'Dark Spell Factory': 'Dark Spells',
			'Workshop': 'Siege Machines',
			'Builder Hall': 'Builder Base Hero',
			'Town Hall': 'Heroes',
			'Builder Barracks': 'Builder Troops'
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
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type) ?? { maxLevel: 0, level: 0 };
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

					return {
						type: unit.type,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel! - 1],
						maxLevel
					};
				}
			);

			if (unitsArray.length) {
				embed.addField(
					category.title,
					this.chunk(unitsArray)
						.map(
							chunks => chunks.map(unit => {
								const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
								const level = this.padStart(unit.level);
								const maxLevel = this.padEnd(unit.hallMaxLevel);
								return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
							}).join(' ')
						)
						.join('\n')
				);
			}
		}

		if (!embed.fields.length) embed.setFooter('No Remaining Upgrades');
		return message.util!.send({ embed });
	}

	private chunk(items: TroopInfo[] = [], chunk = 4) {
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
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
}
