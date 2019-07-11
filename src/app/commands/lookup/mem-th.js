const { Command, Argument } = require('discord-akairo');
const fetch = require('node-fetch');

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

class MembersTHCommand extends Command {
	constructor() {
		super('members-th', {
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
		await message.util.send('**Making list of your clan members... <a:loading:538989228403458089>**');

		this.cache.set(`${message.author.id}${data.tag}`, []);
		const array = this.cache.get(`${message.author.id}${data.tag}`);
		for (const tag of data.memberList.map(member => member.tag)) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
			const member = await res.json();
			array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
		}

		const filter = array.filter(arr => arr.townHallLevel === th);
		const first = this.paginate(th ? filter : array, 0, 32);
		const second = this.paginate(th ? filter : array, 32, 35);
		const third = this.paginate(th ? filter : array, 35, 50);

		const embed = this.client.util.embed().setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium)
			.setDescription(first.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'));
		if ((th && filter.length > 32) || (!th && data.members > 32)) {
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

module.exports = MembersTHCommand;
