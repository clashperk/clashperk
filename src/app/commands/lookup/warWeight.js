const { Command, Flag, Argument } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const fetch = require('node-fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror, TownHallEmoji } = require('../../util/constants');
const { stripIndent } = require('common-tags');

const API = process.env.APIS.split(',');

class WarWeightCommand extends Command {
	constructor() {
		super('warweight', {
			aliases: ['warweight', 'ww'],
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'List of clan members with townhall & heroes.',
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
					return Fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data.clan) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data.clan).then(data => {
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data }) {
		await message.util.send('**Making list of your clan members... <a:loading:538989228403458089>**');

		const list = data.memberList.map(m => m.tag);
		const funcs = new Array(Math.ceil(list.length / 5)).fill().map(() => list.splice(0, 5))
			.map((tags, index) => async (collection = []) => {
				for (const tag of tags) {
					const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
						method: 'GET',
						headers: { accept: 'application/json', authorization: `Bearer ${API[index]}` }
					}).then(res => res.json());
					collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
				}
				return collection;
			});

		const requests = await Promise.all(funcs.map(func => func()));

		const array = [];
		for (const arr of requests) {
			for (const member of arr) {
				array.push({
					tag: member.tag,
					name: member.name,
					townHallLevel: member.townHallLevel,
					heroes: member.heroes.filter(a => a.village === 'home')
				});
			}
		}

		const memberList = this.sort(array);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		const emojis = [
			'<:townhall:631389478568591370>',
			'<:bk:693851738217906196>',
			'<:aq:693851621892816976>',
			'<:gw:693851681108131990>',
			'<:rc:693851787857362974>'
		];

		const header = stripIndent(`${emojis[0]} \u200b \u200b \u200b ${emojis[1]} ${emojis[2]} ${emojis[3]} \u200b ${emojis[4]}`);

		const pages = [
			this.paginate(memberList, 0, 25)
				.items.map(member => {
					const heroes = this.heroes(member.heroes).map(hero => this.padStart(hero.level)).join(' ');
					return `${TownHallEmoji[member.townHallLevel]} \`\u200e ${heroes}  ${this.padEnd(member.name)}\``;
				}),
			this.paginate(memberList, 25, 50)
				.items.map(member => {
					const heroes = this.heroes(member.heroes).map(hero => this.padStart(hero.level)).join(' ');
					return `${TownHallEmoji[member.townHallLevel]} \`\u200e ${heroes}  ${this.padEnd(member.name)}\``;
				})
		];

		if (!pages[1].length) {
			return message.util.send({
				embed: embed.setDescription([
					header,
					pages[0].join('\n')
				])
			});
		}

		const msg = await message.util.send({
			embed: embed.setDescription([
				header,
				pages[0].join('\n')
			]).setFooter('Page 1/2')
		});

		for (const emoji of ['⬅', '➡']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅', '➡'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 45000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡') {
				await msg.edit({
					embed: embed.setDescription([
						header,
						pages[1].join('\n')
					]).setFooter('Page 2/2')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
			if (reaction.emoji.name === '⬅') {
				await msg.edit({
					embed: embed.setDescription([
						header,
						pages[0].join('\n')
					]).setFooter('Page 1/2')
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

	heroes(items) {
		return Object.assign([
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' }
		], items);
	}

	padStart(data) {
		return data.toString().padStart(2, ' ');
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	sort(items) {
		return items.sort((a, b) => b.townHallLevel - a.townHallLevel);
	}
}

module.exports = WarWeightCommand;
