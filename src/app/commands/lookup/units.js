const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { TroopEmojis, HeroEmojis, BuilderTroops, SpellEmojis } = require('../../util/constants');

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
			.setAuthor(`${data.name} (${data.tag})`, data.league ? data.league.iconUrls.small : null, `https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`)
			.setThumbnail(`https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`);

		let index = 0;
		let troopLevels = '';
		data.troops.filter(troop => !['Super Barbarian', 'Super Wall Breaker', 'Super Giant', 'Sneaky Goblin'].includes(troop.name)).forEach(troop => {
			if (troop.village === 'home' && !['Wall Wrecker', 'Stone Slammer', 'Battle Blimp', 'Siege Barracks'].includes(troop.name)) {
				index++;
				if (troop.level === troop.maxLevel) {
					troopLevels += `${TroopEmojis[troop.name]} **\`${troop.level > 9 ? '' : '\u200b '}${troop.level}\`**\u2002\u2002`;
				} else {
					troopLevels += `${TroopEmojis[troop.name]} \`${troop.level > 9 ? '' : '\u200b '}${troop.level}\`\u2002\u2002`;
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
					SiegeMachines += `${TroopEmojis[troop.name]} **\`${troop.level > 9 ? '' : '\u200b '}${troop.level}\`**\u2002\u2002`;
				} else {
					SiegeMachines += `${TroopEmojis[troop.name]} \`${troop.level > 9 ? '' : '\u200b '}${troop.level}\`\u2002\u2002`;
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
					builderTroops += `${BuilderTroops[troop.name]} **\`${troop.level > 9 ? '' : '\u200b '}${troop.level}\`**\u2002\u2002`;
				} else {
					builderTroops += `${BuilderTroops[troop.name]} \`${troop.level > 9 ? '' : '\u200b '}${troop.level}\`\u2002\u2002`;
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
					spellLevels += `${SpellEmojis[spell.name]} **\`${spell.level > 9 ? '' : '\u200b '}${spell.level}\`**\u2002\u2002`;
				} else {
					spellLevels += `${SpellEmojis[spell.name]} \`${spell.level > 9 ? '' : '\u200b '}${spell.level}\`\u2002\u2002`;
				}
				if (index === 4) {
					spellLevels += '#';
					index = 0;
				}
			}
		});
		if (spellLevels) embed.addField('Spells', spellLevels.split('#').join('\n'));

		let heroLevels = '';
		data.heroes.forEach(hero => {
			if (hero.level === hero.maxLevel) {
				heroLevels += `${HeroEmojis[hero.name]} **\`${hero.level > 9 ? '' : '\u200b '}${hero.level}\`**\u2002\u2002`;
			} else {
				heroLevels += `${HeroEmojis[hero.name]} \`${hero.level > 9 ? '' : '\u200b '}${hero.level}\`\u2002\u2002`;
			}
		});
		if (heroLevels) embed.addField('Heroes', heroLevels);

		return message.util.send({ embed });
	}
}

module.exports = UnitsCommand;
