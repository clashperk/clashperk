const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { troops, buildertroops } = require('../../util/troops.json');
const { builderTroopsEmoji, heroEmoji, darkTroopsEmoji, elixirTroopsEmoji, siegeMachinesEmoji, elixirSpellEmoji, darkSpellEmoji } = require('../../util/emojis');

class UnitsCommand extends Command {
	constructor() {
		super('units', {
			aliases: ['units', 'troops'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
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
					await message.util.send({ embed: resolved.embed });
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
				await msg.edit({
					embed: embed.setFooter('Level / Max Level')
				});
				return collector.stop();
			}
		});

		collector.on('end', () => msg.reactions.removeAll());
	}

	async embed(data, option) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, `https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`, `https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`);

		let index = 0;
		let troopLevels = '';
		data.troops.filter(troop => troop.name in elixirTroopsEmoji).forEach(troop => {
			if (troop.village === 'home') {
				index++;
				if (data.townHallLevel === 13) {
					troopLevels += `${elixirTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(false, data.townHallLevel, troop)}\u200f\`\u2002`;
				} else {
					troopLevels += `${elixirTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
				}
				if (index === 4) {
					troopLevels += '#';
					index = 0;
				}
			}
		});
		if (troopLevels) {
			embed.setDescription([
				'\u200e**Elixir Troops**'.padEnd(80, '\u200b \u2002').concat('\u200f \u200e \u200b'),
				troopLevels.split('#').join('\n')
			]);
		}

		index = 0;
		let darkTroops = '';
		data.troops.filter(troop => troop.name in darkTroopsEmoji).forEach(troop => {
			if (troop.village === 'home') {
				index++;
				if (data.townHallLevel === 13) {
					darkTroops += `${darkTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(false, data.townHallLevel, troop)}\u200f\`\u2002`;
				} else {
					darkTroops += `${darkTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
				}
				if (index === 4) {
					darkTroops += '#';
					index = 0;
				}
			}
		});
		if (darkTroops) embed.addField('Dark Troops', darkTroops.split('#').join('\n'));

		index = 0;
		let SiegeMachines = '';
		data.troops.filter(troop => troop.name in siegeMachinesEmoji).forEach(troop => {
			if (troop.village === 'home') {
				index++;
				if (data.townHallLevel === 13) {
					SiegeMachines += `${siegeMachinesEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(false, data.townHallLevel, troop)}\u200f\`\u2002`;
				} else {
					SiegeMachines += `${siegeMachinesEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
				}
				if (index === 4) {
					troopLevels += '#';
					index = 0;
				}
			}
		});
		if (SiegeMachines) embed.addField('Siege Machines', SiegeMachines.split('#').join('\n'));

		let builderTroops = '';
		index = 0;
		data.troops.filter(troop => troop.name in builderTroopsEmoji).forEach(troop => {
			if (troop.village === 'builderBase' && data.builderHallLevel) {
				index++;
				if (data.builderHallLevel === 9) {
					builderTroops += `${builderTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd_(false, data.builderHallLevel, troop)}\u200f\`\u2002`;
				} else {
					builderTroops += `${builderTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd_(option, data.builderHallLevel, troop)}\u200f\`\u2002`;
				}
				if (index === 4) {
					builderTroops += '#';
					index = 0;
				}
			}
		});
		if (builderTroops) embed.addField('Builder Base Troops', builderTroops.split('#').join('\n'));

		let elixirSpells = '';
		index = 0;
		data.spells.filter(spell => spell.name in elixirSpellEmoji).forEach(spell => {
			if (spell.village === 'home') {
				index++;
				if (data.townHallLevel === 13) {
					elixirSpells += `${elixirSpellEmoji[spell.name]} \`\u200e${this.padStart(spell.level)}/${this.padEnd(false, data.townHallLevel, spell)}\u200f\`\u2002`;
				} else {
					elixirSpells += `${elixirSpellEmoji[spell.name]} \`\u200e${this.padStart(spell.level)}/${this.padEnd(option, data.townHallLevel, spell)}\u200f\`\u2002`;
				}
				if (index === 4) {
					elixirSpells += '#';
					index = 0;
				}
			}
		});
		if (elixirSpells) embed.addField('Elixir Spells', `${elixirSpells.split('#').join('\n')}`);

		let darkSpells = '';
		index = 0;
		data.spells.filter(spell => spell.name in darkSpellEmoji).forEach(spell => {
			if (spell.village === 'home') {
				index++;
				if (data.townHallLevel === 13) {
					darkSpells += `${darkSpellEmoji[spell.name]} \`\u200e${this.padStart(spell.level)}/${this.padEnd(false, data.townHallLevel, spell)}\u200f\`\u2002`;
				} else {
					darkSpells += `${darkSpellEmoji[spell.name]} \`\u200e${this.padStart(spell.level)}/${this.padEnd(option, data.townHallLevel, spell)}\u200f\`\u2002`;
				}
				if (index === 4) {
					darkSpells += '#';
					index = 0;
				}
			}
		});
		if (darkSpells) embed.addField('Dark Spells', darkSpells.split('#').join('\n'));

		let builderHero = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'builderBase' && data.builderHallLevel) {
				if (data.builderHallLevel === 9) {
					builderHero += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}/${this.padEnd_(false, data.builderHallLevel, hero)}\u200f\`\u2002`;
				} else {
					builderHero += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}/${this.padEnd_(option, data.builderHallLevel, hero)}\u200f\`\u2002`;
				}
			}
		});

		if (builderHero) embed.addField('Buider Base Hero', builderHero);

		let heroLevels = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				if (data.townHallLevel === 13) {
					heroLevels += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}/${this.padEnd(false, data.townHallLevel, hero)}\u200f\`\u2002`;
				} else {
					heroLevels += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}/${this.padEnd(option, data.townHallLevel, hero)}\u200f\`\u2002`;
				}
			}
		});

		if (heroLevels) embed.addField('Heroes', heroLevels);

		return embed;
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	padStart(num) {
		return num.toString().padStart(2, '\u2002');
	}

	padEnd_(option, builderHallLevel, troop) {
		if (!option) return troop.maxLevel.toString().padEnd(2, '\u2002');
		const num = buildertroops.find(t => t.name === troop.name)[builderHallLevel];
		return num.toString().padEnd(2, '\u2002');
	}

	padEnd(option, townHallLevel, troop) {
		if (!option) return troop.maxLevel.toString().padEnd(2, '\u2002');
		const num = troops.find(t => t.name === troop.name)[townHallLevel];
		return num.toString().padEnd(2, '\u2002');
	}
}

module.exports = UnitsCommand;
