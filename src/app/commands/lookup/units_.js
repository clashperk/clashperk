const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { troops, buildertroops } = require('../../util/troops.json');
const { builderTroopsEmoji, heroEmoji, darkTroopsEmoji, elixirTroopsEmoji, siegeMachinesEmoji, elixirSpellEmoji, darkSpellEmoji } = require('../../util/emojis');

class UnitsCommand extends Command {
	constructor() {
		super('units2', {
			aliases: ['units2', 'troops2'],
			category: 'owner',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows troops and spells of a player.',
				usage: '<#tag>',
				examples: ['#9Q92C8R20']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return Fetch.player(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'player') }) && Flag.cancel();
				if (!data.tags.length) return msg.util.send({ embed: geterror(resolver, 'player') }) && Flag.cancel();
				return Fetch.player(data.tags[0]).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};
		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = await this.embed(data, true);
		const msg = await message.util.send({
			embed: embed.setFooter(`Level / Max Level of Town Hall ${data.townHallLevel}`)
		});

		for (const emoji of ['696655174025871461', '696292379703115780']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['696655174025871461', '696292379703115780'].includes(reaction.emoji.id) && user.id === message.author.id,
			{ time: 45000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '696655174025871461') {
				const embed = await this.embed(data, true);
				await msg.edit({
					embed: embed.setFooter(`Level / Max Level of Town Hall ${data.townHallLevel}`)
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
			if (reaction.emoji.name === '696292379703115780') {
				const embed = await this.embed(data, false);
				await msg.edit({
					embed: embed.setFooter('Level / Max Level')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
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
				if (troop.level === troop.maxLevel) {
					troopLevels += `${elixirTroopsEmoji[troop.name]} **\`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`**\u2002`;
				} else {
					troopLevels += `${elixirTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`\u2002`;
				}
				if (index === 4) {
					troopLevels += '#';
					index = 0;
				}
			}
		});
		if (troopLevels) embed.setDescription(['**Elixir Troops**', troopLevels.split('#').join('\n')]);

		index = 0;
		let darkTroops = '';
		data.troops.filter(troop => troop.name in darkTroopsEmoji).forEach(troop => {
			if (troop.village === 'home') {
				index++;
				if (troop.level === troop.maxLevel) {
					darkTroops += `${darkTroopsEmoji[troop.name]} **\`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`**\u2002`;
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
				if (troop.level === troop.maxLevel) {
					SiegeMachines += `${siegeMachinesEmoji[troop.name]} **\`\u200e${this.padStart(troop.level)}/${this.padEnd(option, data.townHallLevel, troop)}\u200f\`**\u2002`;
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
			if (troop.village === 'builderBase') {
				index++;
				if (troop.level === troop.maxLevel) {
					builderTroops += `${builderTroopsEmoji[troop.name]} \`\u200e${this.padStart(troop.level)}/${this.padEnd_(option, data.builderHallLevel, troop)}\u200f\`\u2002`;
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
				if (spell.level === spell.maxLevel) {
					elixirSpells += `${elixirSpellEmoji[spell.name]} **\`\u200e${this.padStart(spell.level)}/${this.padEnd(option, data.townHallLevel, spell)}\u200f\`**\u2002`;
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
				if (spell.level === spell.maxLevel) {
					darkSpells += `${darkSpellEmoji[spell.name]} **\`\u200e${this.padStart(spell.level)}/${this.padEnd(option, data.townHallLevel, spell)}\u200f\`**\u2002`;
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
			if (hero.village === 'builderBase') {
				if (hero.level === hero.maxLevel) {
					builderHero += `${heroEmoji[hero.name]} **\`\u200e${this.padStart(hero.level)}/${this.padEnd_(option, data.builderHallLevel, hero)}\u200f\`**\u2002`;
				} else {
					builderHero += `${heroEmoji[hero.name]} \`\u200e${this.padStart(hero.level)}/${this.padEnd_(option, data.builderHallLevel, hero)}\u200f\`\u2002`;
				}
			}
		});

		if (builderHero) embed.addField('Buider Base Hero', builderHero);

		let heroLevels = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				if (hero.level === hero.maxLevel) {
					heroLevels += `${heroEmoji[hero.name]} **\`\u200e${this.padStart(hero.level)}/${this.padEnd(option, data.townHallLevel, hero)}\u200f\`**\u2002`;
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
