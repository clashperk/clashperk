const { Command, Argument } = require('discord-akairo');
const { Util } = require('discord.js');
const fetch = require('node-fetch');
const { stripIndent } = require('common-tags');

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

class MemberTHCommand extends Command {
	constructor() {
		super('ml', {
			aliases: ['ml'],
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			cooldown: 20000,
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				},
				{
					id: 'th',
					type: Argument.range('integer', 1, 12, true)
				}
			]
		});

		this.cache = new Map();
	}

	async exec(message, { data, th }) {
		const msg = await message.util.send('**Making list of your clan members... <a:loading:538989228403458089>**');
		let TH12 = '';
		let TH11 = '';
		let TH10 = '';
		let TH09 = '';
		let TH08 = '';
		let TH07 = '';
		let TH06 = '';
		let TH05 = '';
		let TH04 = '';
		let TH03 = '';
		let TH02 = '';
		let TH01 = '';

		this.cache.set(`${message.author.id}${data.tag}`, []);
		const array = this.cache.get(`${message.author.id}${data.tag}`);
		for (const tag of data.memberList.map(member => member.tag)) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
			const member = await res.json();

			const TownHAll = member.townHallLevel;

			if ((!th || th === 12) && TownHAll === 12) TH12 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 11) && TownHAll === 11) TH11 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 10) && TownHAll === 10) TH10 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 9) && TownHAll === 9) TH09 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 8) && TownHAll === 8) TH08 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 7) && TownHAll === 7) TH07 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 6) && TownHAll === 6) TH06 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 5) && TownHAll === 5) TH05 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 4) && TownHAll === 4) TH04 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 3) && TownHAll === 3) TH03 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 2) && TownHAll === 2) TH02 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			if ((!th || th === 1) && TownHAll === 1) TH01 += array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
		}

		const first = this.paginate(array, 0, 32);
		const second = this.paginate(array, 32, 35);
		const third = this.paginate(array, 35, 50);

		const embed = this.client.util.embed().setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium)
			.setDescription(first.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'));
		if (data.members > 32) {
			embed.addField(second.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'), [
				third.items.length ? third.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n') : '\u200b'
			]);
		}

		this.cache.delete(`${message.author.id}${data.tag}`);
		return message.util.send(`*\u200b**Executed in ${((Date.now() - message.createdTimestamp) / 1000).toFixed(2)} sec**\u200b*`, { embed });
	}

	paginate(items, start, end) {
		return {
			items: items.slice(start, end)
		};
	}
}

module.exports = MemberTHCommand;
