const { Command, Flag, Argument } = require('discord-akairo');
const fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');

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
			}
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.reply(`${data.error}`) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_clans')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.reply(`could not find any player linked to **${resolver.user.tag}!**`) && Flag.cancel();
				if (!data[msg.guild.id]) return msg.util.reply(`could not find any player linked to **${resolver.user.tag}!**`) && Flag.cancel();
				return fetch.clan(data[msg.guild.id].tag).then(data => {
					if (data.status !== 200) return msg.util.reply(`${data.error}`) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};

		const th = yield {
			type: Argument.range('integer', 1, 12, true)
		};

		return { data, th };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data, th }) {
		await message.util.send('**Making list of your clan members... <a:loading:538989228403458089>**');

		const array = [];
		for (const tag of data.memberList.map(member => member.tag)) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
			const member = await res.json();
			array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
		}

		const items = this.sort(array);
		const filter = items.filter(arr => arr.townHallLevel === th);
		const first = this.paginate(th ? filter : items, 0, 32);
		const second = this.paginate(th ? filter : items, 32, 35);
		const third = this.paginate(th ? filter : items, 35, 50);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);
		if (first.items.length) embed.setDescription(first.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'));
		if (second.items.length) {
			embed.addField(second.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'), [
				third.items.length ? third.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n') : '\u200b'
			]);
		}

		return message.util.send(`*\u200b**Executed in ${((Date.now() - message.createdTimestamp) / 1000).toFixed(2)} sec**\u200b*`, { embed });
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}

	sort(items) {
		return items.sort((a, b) => b.townHallLevel - a.townHallLevel);
	}
}

module.exports = MembersTHCommand;
