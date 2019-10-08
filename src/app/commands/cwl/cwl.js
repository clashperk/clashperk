const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { Util } = require('discord.js');

const TownHallEmoji = {
	2: '<:townhall2:534745498561806357>',
	3: '<:townhall3:534745539510534144>',
	4: '<:townhall4:534745571798286346>',
	5: '<:townhall5:534745574251954176>',
	6: '<:townhall6:534745574738624524>',
	7: '<:townhall7:534745575732805670>',
	8: '<:townhall8:534745576802353152>',
	9: '<:townhall9:534745577033039882>',
	10: '<:townhall10:534745575757709332>',
	11: '<:townhall11:534745577599270923>',
	12: '<:townhall12:534745574981894154>'
};

const HeroEmojis = {
	'Barbarian King': '<:barbarianking:524939911581663242>',
	'Archer Queen': '<:archerqueen:524939902408720394>',
	'Grand Warden': '<:grandwarden:524939931303411722>',
	'Battle Machine': '<:warmachine:524939920943349781>'
};

class CwlComamnd extends Command {
	constructor() {
		super('cwl', {
			aliases: ['cwl-warmap'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'CWL warmap command.',
				usage: '<tag>',
				examples: ['']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'What would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 2000;
		return 15000;
	}

	async exec(message, { data }) {
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});
		const clan = await res.json();

		const memberList = [];
		for (const { tag } of clan.clans.find(clan => clan.tag === data.tag).members) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
			const member = await res.json();
			memberList.push({
				tag: member.tag,
				name: member.name,
				townHallLevel: member.townHallLevel,
				hero: member.heroes.filter(a => a.village === 'home').map(hero => `${HeroEmojis[hero.name]} ${hero.level}`)
			});
		}

		let members = '';
		// let index = 0;
		const embed = this.client.util.embed();

		for (const member of memberList.sort((a, b) => b.townHallLevel - a.townHallLevel)) {
			members += `${TownHallEmoji[member.townHallLevel]} ${member.name}\n${member.hero} \n`;
		}

		const result = this.split(members);
		console.log(result.length);
		if (Array.isArray(result)) {
			embed.setDescription(result[0])
				.addField(result[1]);
		}

		return message.channel.send({ embed });
	}

	chunk(items = []) {
		const chunk = 10;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	split(content) {
		return Util.splitMessage(content, { maxLength: 2084 });
	}
}

module.exports = CwlComamnd;
