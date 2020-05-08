const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { mongodb } = require('../../struct/Database');
const { emoji, townHallEmoji, heroEmoji } = require('../../util/emojis');

class ProfileCommand extends Command {
	constructor() {
		super('profile', {
			aliases: ['profile', 'whois'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Shows information about your profile.',
				usage: '<member>',
				examples: ['', 'Suvajit', 'Reza', '@gop']
			},
			args: [
				{
					id: 'member',
					type: 'guildMember',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { member }) {
		const data = await this.getProfile(member.id);
		if (!data) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `Couldn\'t find a player linked to **${member.user.tag}**!`
				}
			});
		}

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${member.user.tag}`, member.user.displayAvatarURL());

		if (!data.tags.length) {
			embed.setTitle('No Accounts are Linked');
		}

		let index = 0;
		const collection = [];
		for (const tag of data.tags) {
			index += 1;
			const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
			});
			if (!res.ok) continue;
			const data = await res.json();

			collection.push({
				field: `${townHallEmoji[data.townHallLevel]} [${data.name} (${data.tag})](https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag})`,
				values: [this.heroes(data), this.clanName(data), '\u200b\u2002'].filter(a => a.length)
			});

			if (index === 30) break;
		}

		let page = 1;
		const paginated = this.paginate(collection, page);

		embed.setFooter(`Accounts [${index}/25] (Page ${paginated.page}/${paginated.maxPage})`);

		const msg = await message.util.send({
			embed: embed.setDescription(paginated.items.map(({ field, values }) => `${field}\n${values.join('\n')}`).join('\n'))
		});

		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				const paginated = this.paginate(collection, page);
				await msg.edit({
					embed: embed.setFooter(`Accounts [${index}/25] (Page ${paginated.page}/${paginated.maxPage})`)
						.setDescription(paginated.items.map(({ field, values }) => `${field}\n${values.join('\n')}`).join('\n'))
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				const paginated = this.paginate(collection, page);
				await msg.edit({
					embed: embed.setFooter(`Accounts [${index}/25] (Page ${paginated.page}/${paginated.maxPage})`)
						.setDescription(paginated.items.map(({ field, values }) => `${field}\n${values.join('\n')}`).join('\n'))
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

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	clanName(data) {
		if (!data.clan) return `${emoji.clan} Not in a Clan`;
		const clanRole = data.role.replace(/admin/g, 'Elder')
			.replace(/coLeader/g, 'Co-Leader')
			.replace(/member/g, 'Member')
			.replace(/leader/g, 'Leader');

		return `${emoji.clan} ${clanRole} of ${data.clan.name}`;
	}

	heroes(data) {
		if (!data.heroes) return '';
		return data.heroes.filter(hero => hero.village === 'home')
			.map(hero => `${heroEmoji[hero.name]} ${hero.level}`).join(' ');
	}

	async getProfile(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.findOne({ user: id });

		return data;
	}

	async getClan(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedclans')
			.findOne({ user: id });

		return data;
	}

	paginate(items, page = 1, pageLength = 5) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
	}
}

module.exports = ProfileCommand;
