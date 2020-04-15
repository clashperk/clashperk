const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror, monospace } = require('../../util/constants');
const { builderTroopsEmoji, heroEmoji, darkTroopsEmoji, elixirTroopsEmoji, siegeMachinesEmoji, elixirSpellEmoji, darkSpellEmoji } = require('../../util/emojis');

class UnitsCommand extends Command {
	constructor() {
		super('units', {
			aliases: ['units', 'troops'],
			category: 'lookup',
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, `https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`, `https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`);

		let index = 0;
		let troopLevels = '';
		data.troops.filter(troop => troop.name in elixirTroopsEmoji).forEach(troop => {
			if (troop.village === 'home') {
				index++;
				if (troop.level === troop.maxLevel) {
					troopLevels += `${elixirTroopsEmoji[troop.name]} **${this.formatNum(troop.level)}**/${this.formatNum(troop.maxLevel)}\u2002`;
				} else {
					troopLevels += `${elixirTroopsEmoji[troop.name]} ${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}\u2002`;
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
					darkTroops += `${darkTroopsEmoji[troop.name]} **${this.formatNum(troop.level)}**/${this.formatNum(troop.maxLevel)}\u2002`;
				} else {
					darkTroops += `${darkTroopsEmoji[troop.name]} ${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}\u2002`;
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
					SiegeMachines += `${siegeMachinesEmoji[troop.name]} **${this.formatNum(troop.level)}**/${this.formatNum(troop.maxLevel)}\u2002`;
				} else {
					SiegeMachines += `${siegeMachinesEmoji[troop.name]} ${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}\u2002`;
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
					builderTroops += `${builderTroopsEmoji[troop.name]} **${this.formatNum(troop.level)}**/${this.formatNum(troop.maxLevel)}\u2002`;
				} else {
					builderTroops += `${builderTroopsEmoji[troop.name]} ${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}\u2002`;
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
					elixirSpells += `${elixirSpellEmoji[spell.name]} **${this.formatNum(spell.level)}**/${this.formatNum(spell.maxLevel)}\u2002`;
				} else {
					elixirSpells += `${elixirSpellEmoji[spell.name]} ${this.formatNum(spell.level)}/${this.formatNum(spell.maxLevel)}\u2002`;
				}
				if (index === 4) {
					elixirSpells += '#';
					index = 0;
				}
			}
		});
		if (elixirSpells) embed.addField('Elixir Spells', elixirSpells.split('#').join('\n'));

		let darkSpells = '';
		index = 0;
		data.spells.filter(spell => spell.name in darkSpellEmoji).forEach(spell => {
			if (spell.village === 'home') {
				index++;
				if (spell.level === spell.maxLevel) {
					darkSpells += `${darkSpellEmoji[spell.name]} **${this.formatNum(spell.level)}**/${this.formatNum(spell.maxLevel)}\u2002`;
				} else {
					darkSpells += `${darkSpellEmoji[spell.name]} ${this.formatNum(spell.level)}/${this.formatNum(spell.maxLevel)}\u2002`;
				}
				if (index === 4) {
					darkSpells += '#';
					index = 0;
				}
			}
		});
		if (darkSpells) embed.addField('Dark Spells', darkSpells.split('#').join('\n'));

		let heroLevels = '';
		index = 0;
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				index++;
				if (hero.level === hero.maxLevel) {
					heroLevels += `${heroEmoji[hero.name]} **${this.formatNum(hero.level)}**/${this.formatNum(hero.maxLevel)}\u2002`;
				} else {
					heroLevels += `${heroEmoji[hero.name]} ${this.formatNum(hero.level)}/${this.formatNum(hero.maxLevel)}\u2002`;
				}
			}
		});

		data.heroes.forEach(hero => {
			if (hero.village === 'builderBase') {
				if (index === 4) {
					heroLevels += '#';
					index = 0;
				}
				if (hero.level === hero.maxLevel) {
					heroLevels += `${heroEmoji[hero.name]} **${this.formatNum(hero.level)}**/${this.formatNum(hero.maxLevel)}\u2002`;
				} else {
					heroLevels += `${heroEmoji[hero.name]} ${this.formatNum(hero.level)}/${this.formatNum(hero.maxLevel)}\u2002`;
				}
			}
		});
		if (heroLevels) embed.addField('Heroes', heroLevels.split('#').join('\n'));

		return message.util.send({ embed });
	}

	formatNum(num) {
		return monospace(num.toString().padStart(2, '0'));
	}
}

module.exports = UnitsCommand;
