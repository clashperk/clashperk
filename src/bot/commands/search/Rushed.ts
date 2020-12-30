import { BUILDER_TROOPS, HOME_TROOPS } from '../../util/Emojis';
import { TroopInfo, TroopJSON } from '../../util/Constants';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { MessageEmbed, Message } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class RushedCommand extends Command {
	public constructor() {
		super('rushed', {
			aliases: ['rushed', 'rush'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: [
					'Shows all rushed troop/spell/hero.',
					'',
					'• `rushed clan <clanTag>` - list of rushed & non-rushed clan members.'
				],
				usage: '<playerTag>',
				examples: ['#9Q92C8R20', 'clan #8QU8J9LP']
			},
			flags: ['--clan', '-c', 'clan']
		});
	}

	public *args() {
		const flag = yield {
			match: 'flag',
			flag: ['--clan', '-c', 'clan']
		};

		const data = yield {
			type: async (message: Message, args: string) => {
				if (flag) return this.client.resolver.resolveClan(message, args);
				return this.client.resolver.resolvePlayer(message, args);
			}
		};

		return { data, flag };
	}

	public async exec(message: Message, { data, flag }: { data: Clan | Player; flag: boolean }) {
		if (flag) return this.clan(message, data as Clan);
		const embed = this.embed(data as Player);
		embed.setColor(this.client.embed(message));
		return message.util!.send({ embed });
	}

	private embed(data: Player) {
		const embed = new MessageEmbed()
			.setAuthor(
				`${data.name} (${data.tag})`,
				`https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`,
				`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`
			);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 2] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 2] > (apiTroop?.level ?? 0);
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
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;
					const { maxLevel, level } = apiTroops
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type) ?? { maxLevel: unit.levels[hallLevel! - 1], level: 0 };

					return {
						type: unit.type,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel! - 2],
						maxLevel
					};
				}
			);

			if (unitsArray.length) {
				embed.addField(
					`${category.title} (${unitsArray.length})`,
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

		embed.setFooter('Rushed Troops');
		if (!embed.fields.length) embed.setFooter('No Rushed Troops');
		return embed;
	}

	private async clan(message: Message, data: Clan) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = [];
		for (const { name, troops, spells, heroes, townHallLevel } of fetched) {
			let i = 0;
			i += this.reduce(troops, townHallLevel, 'home');
			i += this.reduce(spells, townHallLevel, 'home');
			i += this.reduce(heroes, townHallLevel, 'home');

			members.push({ name, count: i, townHallLevel });
		}

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`)
			.setDescription([
				'Rushed Members [Troop, Spell & Hero Count]',
				'```\u200eTH  👎  NAME',
				members.filter(m => m.count)
					.sort((a, b) => b.count - a.count)
					.map(({ name, count, townHallLevel }) => `${this.padding(townHallLevel)}  ${this.padding(count)}  ${name}`)
					.join('\n'),
				'```'
			]);
		if (members.filter(m => !m.count).length) {
			embed.addField('Non-Rushed Members', [
				'```\u200eTH  NAME',
				members.filter(m => !m.count)
					.sort((a, b) => b.townHallLevel - a.townHallLevel)
					.map(({ name, townHallLevel }) => `${this.padding(townHallLevel)}  ${name}`)
					.join('\n'),
				'```'
			]);
		}

		return message.util!.send({ embed });
	}

	private padding(num: number) {
		return num > 0 ? num.toString().padEnd(2, '\u2002') : '🔥';
	}

	private reduce(collection: Player['troops'] = [], hallLevel: number, villageType: string) {
		return collection.reduce((i, a) => {
			if (a.village === villageType && a.level !== a.maxLevel) {
				const min = RAW_TROOPS_DATA.TROOPS.find(unit => unit.name === a.name && unit.village === villageType);
				if (min && a.level < min.levels[hallLevel - 2]) i += 1;
			}
			return i;
		}, 0);
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
