const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { BUILDER_TROOPS, HOME_TROOPS } = require('../../util/emojis');
const RAW_TROOPS_DATA = require('../../util/TroopsInfo');

class UnitsCommand extends Command {
	constructor() {
		super('units', {
			aliases: ['units', 'troops', 'u'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'Shows troop, spell & hero levels.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args, true);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = await this.embed(data, true);
		embed.setColor(this.client.embed(message))
			.setFooter(`Level / Town Hall ${data.townHallLevel}${data.builderHallLevel ? ` & Builder Hall ${data.builderHallLevel}` : ''} Max`);
		const msg = await message.util.send({ embed });

		await msg.react('🔥');
		const collector = msg.createReactionCollector(
			(reaction, user) => ['🔥'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 45000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '🔥') {
				const embed = await this.embed(data, false);
				embed.setColor(this.client.embed(message));
				await msg.edit({
					embed: embed.setFooter('Level / Max Level')
				});
				return collector.stop();
			}
		});

		collector.on('end', () => msg.reactions.removeAll());
	}

	chunk(items = [], chunk = 4) {
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	async embed(data, option = true) {
		const embed = new MessageEmbed()
			.setAuthor(
				`${data.name} (${data.tag})`,
				`https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`,
				`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`
			);

		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > 0;
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel - 1] > 0;
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
			'Spell Factory': 'Elixier Spells',
			'Dark Spell Factory': 'Dark Spells',
			'Workshop': 'Siege Machines',
			'Builder Hall': 'Builder Base Hero',
			'Town Hall': 'Heroes',
			'Builder Barracks': 'Builder Troops'
		};

		const apiTroops = this.apiTroops(data);
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
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type) || { maxlevel: 0, level: 0 };
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

					return {
						type: unit.type,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel - 1],
						maxLevel
					};
				}
			);

			embed.addField(
				category.title,
				this.chunk(unitsArray)
					.map(
						chunks => chunks.map(unit => {
							const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
							const level = this.padStart(unit.level);
							const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
							return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
						}).join(' ')
					)
					.join('\n')
			);
		}

		return embed;
	}

	padEnd(num) {
		return num.toString().padEnd(2, ' ');
	}

	padStart(num) {
		return num.toString().padStart(2, ' ');
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
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

module.exports = UnitsCommand;
