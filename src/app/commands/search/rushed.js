const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { BUILDER_TROOPS, HOME_TROOPS } = require('../../util/emojis');
const RAW_TROOPS_DATA = require('../../util/TroopsInfo');
const fetch = require('node-fetch');
const TOKENS = process.env.CLASH_TOKENS.split(',');

class RushedCommand extends Command {
	constructor() {
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

	*args() {
		const clan = yield {
			match: 'flag',
			flag: ['--clan', '-c', 'clan']
		};

		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args, clan ? false : true);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data, clan };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	chunk(items = [], chunk = 4) {
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	async exec(message, { data, clan }) {
		if (clan) return this.clan(message, data);
		const embed = await this.embed(data, true);
		embed.setColor(this.client.embed(message));
		return message.util.send({ embed });
	}

	async embed(data) {
		const embed = new MessageEmbed()
			.setFooter('Rushed Troops')
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
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel - 2] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			})
			.reduce((prev, curr) => {
				if (curr?.productionBuilding in prev === false) prev[curr?.productionBuilding] = [];
				prev[curr?.productionBuilding].push(curr);
				return prev;
			}, {});

		const titles = {
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
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type) || { maxLevel: unit.levels[hallLevel - 1], level: 0 };

					return {
						type: unit.type,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel - 2],
						maxLevel
					};
				}
			);

			embed.addField(
				`${category.title} [${unitsArray.length}]`,
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

		return embed;
	}

	async clan(message, data) {
		if (data.members < 1) return message.util.send(`\u200e**${data.name}** does not have any clan members...`);
		const KEYS = TOKENS.map(token => ({ n: Math.random(), token })).sort((a, b) => a.n - b.n).map(a => a.token);
		const requests = data.memberList.map((m, i) => {
			const req = {
				url: `https://api.clashofclans.com/v1/players/${encodeURIComponent(m.tag)}`,
				option: {
					method: 'GET',
					headers: { accept: 'application/json', authorization: `Bearer ${KEYS[i % KEYS.length]}` }
				}
			};
			return req;
		});

		const responses = await Promise.all(requests.map(req => fetch(req.url, req.option)));
		const fetched = await Promise.all(responses.map(res => res.json()));

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

		return message.util.send({ embed });
	}

	padding(num) {
		return num > 0 ? num.toString().padEnd(2, '\u2002') : '🔥';
	}

	reduce(collection = [], hallLevel, villageType) {
		return collection.reduce((i, a) => {
			if (a.village === villageType && a.level !== a.maxLevel) {
				const min = RAW_TROOPS_DATA.TROOPS.find(unit => unit.name === a.name && unit.village === villageType);
				if (min && a.level < min.levels[hallLevel - 2]) i += 1;
			}
			return i;
		}, 0);
	}

	padEnd(num) {
		return num.toString().padEnd(2, ' ');
	}

	padStart(num) {
		return num.toString().padStart(2, ' ');
	}

	apiTroops(data) {
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

module.exports = RushedCommand;
