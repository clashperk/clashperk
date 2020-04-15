const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { homeTroopsEmoji, builderTroopsEmoji, heroEmoji, spellEmoji } = require('../../util/emojis');

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
		data.troops.filter(troop => !['Super Barbarian', 'Super Wall Breaker', 'Super Giant', 'Sneaky Goblin'].includes(troop.name)).forEach(troop => {
			if (troop.village === 'home' && !['Wall Wrecker', 'Stone Slammer', 'Battle Blimp', 'Siege Barracks'].includes(troop.name)) {
				index++;
				if (troop.level === troop.maxLevel) {
					troopLevels += `${homeTroopsEmoji[troop.name]} **${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}**\u2002`;
				} else {
					troopLevels += `${homeTroopsEmoji[troop.name]} ${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}\u2002`;
				}
				if (index === 4) {
					troopLevels += '#';
					index = 0;
				}
			}
		});
		if (troopLevels) embed.setDescription(['Troops', troopLevels.split('#').join('\n')]);

		index = 0;
		let SiegeMachines = '';
		data.troops.forEach(troop => {
			if (troop.village === 'home' && ['Wall Wrecker', 'Stone Slammer', 'Battle Blimp', 'Siege Barracks'].includes(troop.name)) {
				index++;
				if (troop.level === troop.maxLevel) {
					SiegeMachines += `${homeTroopsEmoji[troop.name]} **${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}**\u2002`;
				} else {
					SiegeMachines += `${homeTroopsEmoji[troop.name]} ${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}\u2002`;
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
		data.troops.forEach(troop => {
			if (troop.village === 'builderBase') {
				index++;
				if (troop.level === troop.maxLevel) {
					builderTroops += `${builderTroopsEmoji[troop.name]} **${this.formatNum(troop.level)}/${this.formatNum(troop.maxLevel)}**\u2002`;
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

		let spellLevels = '';
		index = 0;
		data.spells.forEach(spell => {
			if (spell.village === 'home') {
				index++;
				if (spell.level === spell.maxLevel) {
					spellLevels += `${spellEmoji[spell.name]} **${this.formatNum(spell.level)}/${this.formatNum(spell.maxLevel)}**\u2002`;
				} else {
					spellLevels += `${spellEmoji[spell.name]} ${this.formatNum(spell.level)}/${this.formatNum(spell.maxLevel)}\u2002`;
				}
				if (index === 4) {
					spellLevels += '#';
					index = 0;
				}
			}
		});
		if (spellLevels) embed.addField('Spells', spellLevels.split('#').join('\n'));

		let heroLevels = '';
		index = 0;
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				index++;
				if (hero.level === hero.maxLevel) {
					heroLevels += `${heroEmoji[hero.name]} **${this.formatNum(hero.level)}/${this.formatNum(hero.maxLevel)}**\u2002`;
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
					heroLevels += `${heroEmoji[hero.name]} **${this.formatNum(hero.level)}/${this.formatNum(hero.maxLevel)}**\u2002`;
				} else {
					heroLevels += `${heroEmoji[hero.name]} ${this.formatNum(hero.level)}/${this.formatNum(hero.maxLevel)}\u2002`;
				}
			}
		});
		if (heroLevels) embed.addField('Heroes', heroLevels.split('#').join('\n'));

		return message.util.send({ embed });
	}

	formatNum(num) {
		const num_string = num < 10
			? num.toString()
				.padEnd(2, '\u2002')
			: num.toString();

		return num_string
			.replace(/0/g, '𝟶')
			.replace(/1/g, '𝟷')
			.replace(/2/g, '𝟸')
			.replace(/3/g, '𝟹')
			.replace(/4/g, '𝟺')
			.replace(/5/g, '𝟻')
			.replace(/6/g, '𝟼')
			.replace(/7/g, '𝟽')
			.replace(/8/g, '𝟾')
			.replace(/9/g, '𝟿');
	}
}

module.exports = UnitsCommand;
