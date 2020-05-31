const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { troops, buildertroops } = require('../../util/troops.json');
const { oneLine } = require('common-tags');
const { builderTroopsEmoji, heroEmoji, darkTroopsEmoji, elixirTroopsEmoji, siegeMachinesEmoji, elixirSpellEmoji, darkSpellEmoji } = require('../../util/emojis');

class RushedCommand extends Command {
	constructor() {
		super('rushed', {
			aliases: ['rushed'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows all troop, spell & hero upgrades remaining.',
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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = await this.embed(data, true);
		return message.util.send({ embed });
	}

	async embed(data, option) {
		let rushed = 0;
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, `https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`, `https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`);

		let index = 0;
		let troopLevels = '';
		data.troops.filter(troop => troop.name in elixirTroopsEmoji).forEach(troop => {
			if (troop.village === 'home') {
				if (troop.level !== troop.maxLevel) {
					const rushedLevel = troops.find(t => t.name === troop.name)[data.townHallLevel - 1];
					const maxLevel = troops.find(t => t.name === troop.name)[data.townHallLevel];
					if (troop.level < rushedLevel) {
						index++;
						rushed++;
						troopLevels += `${elixirTroopsEmoji[troop.name]} `;
						troopLevels += oneLine`\`\u200e${this.padStart(troop.level)}|${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
						if (index === 4) {
							troopLevels += '#';
							index = 0;
						}
					}
				}
			}
		});
		if (troopLevels) {
			embed.setDescription([
				'**Elixir Troops**',
				troopLevels.split('#').join('\n')
			]);
		}

		index = 0;
		let darkTroops = '';
		data.troops.filter(troop => troop.name in darkTroopsEmoji).forEach(troop => {
			if (troop.village === 'home') {
				if (troop.level !== troop.maxLevel) {
					const maxLevel = troops.find(t => t.name === troop.name)[data.townHallLevel - 1];
					if (troop.level < maxLevel) {
						index++;
						rushed++;
						darkTroops += `${darkTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}|${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
						if (index === 4) {
							darkTroops += '#';
							index = 0;
						}
					}
				}
			}
		});
		if (darkTroops) embed.addField('Dark Troops', darkTroops.split('#').join('\n'));

		index = 0;
		let SiegeMachines = '';
		data.troops.filter(troop => troop.name in siegeMachinesEmoji).forEach(troop => {
			if (troop.village === 'home') {
				if (troop.level !== troop.maxLevel) {
					const maxLevel = troops.find(t => t.name === troop.name)[data.townHallLevel - 1];
					if (troop.level < maxLevel) {
						index++;
						rushed++;
						SiegeMachines += `${siegeMachinesEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}|${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
						if (index === 4) {
							troopLevels += '#';
							index = 0;
						}
					}
				}
			}
		});
		if (SiegeMachines) embed.addField('Siege Machines', SiegeMachines.split('#').join('\n'));

		/* let builderTroops = '';
		index = 0;
		data.troops.filter(troop => troop.name in builderTroopsEmoji).forEach(troop => {
			if (troop.village === 'builderBase' && data.builderHallLevel) {
				if (troop.level !== troop.maxLevel) {
					const maxLevel = buildertroops.find(t => t.name === troop.name)[data.builderHallLevel - 1];
					if (troop.level < maxLevel) {
						index++;
						rushed++;
						builderTroops += `${builderTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}|${this.padEnd_(option, data.builderHallLevel, troop)}\u200f\`\u2002`;
						if (index === 4) {
							builderTroops += '#';
							index = 0;
						}
					}
				}
			}
		});
		if (builderTroops) embed.addField('Builder Base Troops', builderTroops.split('#').join('\n'));*/

		let elixirSpells = '';
		index = 0;
		data.spells.filter(spell => spell.name in elixirSpellEmoji).forEach(spell => {
			if (spell.village === 'home') {
				if (spell.level !== spell.maxLevel) {
					const maxLevel = troops.find(t => t.name === spell.name)[data.townHallLevel - 1];
					if (spell.level < maxLevel) {
						index++;
						rushed++;
						elixirSpells += `${elixirSpellEmoji[spell.name]} **\`\u200e${this.padStart(spell.level)}|${this.padEnd(option, data.townHallLevel, spell)}\u200f\`**\u2002`;
						if (index === 4) {
							elixirSpells += '#';
							index = 0;
						}
					}
				}
			}
		});
		if (elixirSpells) embed.addField('Elixir Spells', `${elixirSpells.split('#').join('\n')}`);

		let darkSpells = '';
		index = 0;
		data.spells.filter(spell => spell.name in darkSpellEmoji).forEach(spell => {
			if (spell.village === 'home') {
				if (spell.level !== spell.maxLevel) {
					const maxLevel = troops.find(t => t.name === spell.name)[data.townHallLevel - 1];
					if (spell.level < maxLevel) {
						index++;
						rushed++;
						darkSpells += `${darkSpellEmoji[spell.name]} **\`\u200e${this.padStart(spell.level)}|${this.padEnd(option, data.townHallLevel, spell)}\u200f\`**\u2002`;
						if (index === 4) {
							darkSpells += '#';
							index = 0;
						}
					}
				}
			}
		});
		if (darkSpells) embed.addField('Dark Spells', darkSpells.split('#').join('\n'));

		/* let builderHero = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'builderBase' && data.builderHallLevel) {
				if (hero.level !== hero.maxLevel) {
					const maxLevel = buildertroops.find(t => t.name === hero.name)[data.builderHallLevel - 1];
					if (hero.level < maxLevel) {
						rushed++;
						builderHero += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}|${this.padEnd_(option, data.builderHallLevel, hero)}\u200f\`**\u2002`;
					}
				}
			}
		});

		if (builderHero) embed.addField('Buider Base Hero', builderHero);*/

		let heroLevels = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				if (hero.level !== hero.maxLevel) {
					const maxLevel = troops.find(t => t.name === hero.name)[data.townHallLevel - 1];
					if (hero.level < maxLevel) {
						rushed++;
						heroLevels += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}|${this.padEnd(option, data.townHallLevel, hero)}+\u200f\`\u2002`;
					}
				}
			}
		});

		if (heroLevels) embed.addField('Heroes', heroLevels);
		embed.setFooter(`Rushed Troops: ${rushed}`);

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
		return num.toString().padEnd(2, `${troop.level === troop.maxLevel ? '\u2002' : '+'}`);
	}
}

module.exports = RushedCommand;
