const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');

const HeroEmojis = {
	'Barbarian King': '<:barbarianking:524939911581663242>',
	'Archer Queen': '<:archerqueen:524939902408720394>',
	'Grand Warden': '<:grandwarden:524939931303411722>',
	'Battle Machine': '<:warmachine:524939920943349781>'
};
const TroopEmojis = {
	'Barbarian': '<:barbarian:524921080951865354>',
	'Archer': '<:archer:524921038862024723>',
	'Goblin': '<:goblin:524921092368891925>',
	'Giant': '<:giant:524921093652348955>',
	'Wall Breaker': '<:wallbreaker:524921094814171147>',
	'Balloon': '<:balloonc:524921095363493912>',
	'Wizard': '<:wizard:524921085645291522>',
	'Healer': '<:healer:524921090196242432>',
	'Dragon': '<:dragonc:524921090884108288>',
	'P.E.K.K.A': '<:pekka:524921093753012227>',
	'Minion': '<:minion:524921093132255232>',
	'Hog Rider': '<:hogrider:524921085561667584>',
	'Valkyrie': '<:valkyrie:524921093031723019>',
	'Golem': '<:golem:524921095300579328>',
	'Witch': '<:witch:524921091383099404>',
	'Lava Hound': '<:lavahound:524921094185156619>',
	'Bowler': '<:bowler:524921085024534528>',
	'Baby Dragon': '<:babydragon:524921039004631050>',
	'Miner': '<:miner:524921087461425162>',
	'Electro Dragon': '<:electrodragon:524921092213833750>',
	'Ice Golem': '<:ice_golem:627156215394467851>',
	'Battle Blimp': '<:battleblimp:524921096345092126>',
	'Wall Wrecker': '<:wallwrecker:524921096655339520>',
	'Stone Slammer': '<:Stone_Slammer_info:524937839457337374>'
};
const BuilderTroops = {
	'Night Witch': '<:night_witch:627148850800492574>',
	'Baby Dragon': '<:baby_dragon:627148415473680415>',
	'Drop Ship': '<:drop_ship:627151120896098345>',
	'Cannon Cart': '<:cannon_cart:627148662547677204>',
	'Super P.E.K.K.A': '<:supper_pekka:627149954917466142>',
	'Bomber': '<:bomber:627148263233159188>',
	'Boxer Giant': '<:boxer_giant:627148013512556544>',
	'Beta Minion': '<:beta_minion:627148135373864960>',
	'Sneaky Archer': '<:skeaky_archer:627147702584606722>',
	'Raged Barbarian': '<:raged_barbarian:627147507717111808>'
};
const SpellEmojis = {
	'Lightning Spell': '<:lightning:524921197369229342>',
	'Healing Spell': '<:healing:524921190834503723>',
	'Rage Spell': '<:ragec:524921200900833280>',
	'Jump Spell': '<:jump:524921194437279745>',
	'Freeze Spell': '<:freeze:524921189290999818>',
	'Poison Spell': '<:poison:524921198312816641>',
	'Earthquake Spell': '<:earthquake:524921182659674122>',
	'Haste Spell': '<:haste:524921185549418506>',
	'Clone Spell': '<:clone:524921180910518272>',
	'Skeleton Spell': '<:skeleton:524921203975127049>',
	'Bat Spell': '<:Bat_Spell_info:524937829122441227>'
};

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
				const data = await firestore.collection('linked_players')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'player') }) && Flag.cancel();
				if (!data[msg.guild.id]) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.player(data[msg.guild.id].tag).then(data => {
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
		data.troops.forEach(troop => {
			if (troop.village === 'home') {
				index++;
				if (troop.level === troop.maxLevel) {
					troopLevels += `${TroopEmojis[troop.name]} **\`${troop.level}${troop.level > 9 ? '' : ' \u200b'}\`**\u2002\u2002`;
				} else {
					troopLevels += `${TroopEmojis[troop.name]} \`${troop.level}${troop.level > 9 ? '' : ' \u200b'}\`\u2002\u2002`;
				}
				if (index === 4) {
					troopLevels += '#';
					index = 0;
				}
			}
		});
		if (troopLevels) embed.addField('Troops', troopLevels.split('#').join('\n'));

		let builderTroops = '';
		index = 0;
		data.troops.forEach(troop => {
			if (troop.village === 'builderBase') {
				index++;
				if (troop.level === troop.maxLevel) {
					builderTroops += `${BuilderTroops[troop.name]} **\`${troop.level}${troop.level > 9 ? '' : ' \u200b'}\`**\u2002\u2002`;
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
					spellLevels += `${SpellEmojis[spell.name]} **\`${spell.level}${spell.level > 9 ? '' : ' \u200b'}\`**\u2002\u2002`;
				} else {
					spellLevels += `${SpellEmojis[spell.name]} \`${spell.level}${spell.level > 9 ? '' : ' \u200b'}\`\u2002\u2002`;
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
				heroLevels += `${HeroEmojis[hero.name]} **\`${hero.level}${hero.level > 9 ? '' : ' \u200b'}\`**\u2002\u2002`;
			} else {
				heroLevels += `${HeroEmojis[hero.name]} \`${hero.level}${hero.level > 9 ? '' : ' \u200b'}\`\u2002\u2002`;
			}
		});
		if (heroLevels) embed.addField('Heroes', heroLevels);

		return message.util.send({ embed });
	}
}

module.exports = UnitsCommand;
