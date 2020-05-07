const { Command, Argument } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { emoji } = require('../../util/emojis');
const { mongodb } = require('../../struct/Database');

class ClansCommand extends Command {
	constructor() {
		super('clans', {
			aliases: ['clans', 'tracking', 'info'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows all clans related to the server.'
			},
			args: [
				{
					id: 'page',
					type: Argument.range('integer', 1, 100),
					default: 1
				},
				{
					id: 'guild',
					type: (msg, id) => {
						if (!id) return null;
						if (!this.client.isOwner(msg.author.id)) return null;
						const guild = this.client.guilds.cache.get(id);
						if (!guild) return null;
						return guild;
					},
					default: message => message.guild
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { guild, page }) {
		await message.util.send(`**Feching data... ${emoji.loading}**`);
		const premium = this.client.patron.get(guild.id, 'guild', false);
		const collection = await this.findAll(guild);
		const db = mongodb.db('clashperk');
		const data = await Promise.all(collection.map(async item => {
			const donationlog = await db.collection('donationlogs').findOne({ clan_id: item._id });
			const playerlog = await db.collection('playerlogs').findOne({ clan_id: item._id });
			const onlinelog = await db.collection('lastonlinelogs').findOne({ clan_id: item._id });
			const clanembed = await db.collection('clanembedlogs').findOne({ clan_id: item._id });
			const clangames = await db.collection('clangameslogs').findOne({ clan_id: item._id });

			return {
				tag: item.tag,
				name: item.name,
				donationlog: donationlog
					? donationlog.channel
					: null,
				playerlog: playerlog
					? playerlog.channel
					: null,
				onlinelog: onlinelog
					? onlinelog.channel
					: null,
				clanembedlog: clanembed
					? clanembed.channel
					: null,
				clangameslog: clangames
					? clangames.channel
					: null
			};
		}));

		if (data) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${guild.name}`, guild.iconURL());
			if (data.length) {
				const paginated = this.paginate(data, page);
				embed.setDescription([
					`${premium ? `**Subscription** \nActive ${emoji.authorize}` : ''}`,
					'',
					paginated.items.map((item, index) => {
						const donationlog = this.client.channels.cache.has(item.donationlog);
						const playerlog = this.client.channels.cache.has(item.playerlog);
						const onlinelog = this.client.channels.cache.has(item.onlinelog);
						const clanembedlog = this.client.channels.cache.has(item.clanembedlog);
						const clangameslog = this.client.channels.cache.has(item.clangameslog);
						const logs = [
							item.donationlog
								? donationlog
									? `${emoji.ok} Enabled \n${emoji.channel} <#${item.donationlog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${item.donationlog}>`
								: '',
							item.playerlog
								? playerlog
									? `${emoji.ok} Enabled \n${emoji.channel} <#${item.playerlog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${item.playerlog}>`
								: '',
							item.onlinelog
								? onlinelog
									? `${emoji.ok} Enabled \n${emoji.channel} <#${item.onlinelog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${item.onlinelog}>`
								: '',
							item.clanembedlog
								? clanembedlog
									? `${emoji.ok} Enabled \n${emoji.channel} <#${item.clanembedlog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${item.clanembedlog}>`
								: '',
							item.clangameslog
								? clangameslog
									? `${emoji.ok} Enabled \n${emoji.channel} <#${item.clangameslog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${item.clangameslog}>`
								: ''
						];
						return [
							`**[${item.name} (${item.tag})](${this.openInGame(item.tag)})**`,
							`${logs[0].length ? `**DonationLog**\n${logs[0]}` : ''}`,
							`${logs[1].length ? `**PlayerLog**\n${logs[1]}` : ''}`,
							`${logs[2].length ? `**Last-Online Board**\n${logs[2]}` : ''}`,
							`${logs[3].length ? `**Clan Embed**\n${logs[3]}` : ''}`,
							`${logs[4].length ? `**Clan Games Board**\n${logs[4]}` : ''}`
						].filter(item => item.length).join('\n');
					}).join('\n\n')
				]);

				embed.setFooter([
					paginated.maxPage > 1
						? `Page ${paginated.page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`
						: `${data.length} ${data.length === 1 ? 'clan' : 'clans'}`
				]);
			} else {
				embed.setDescription(`${message.guild.name} doesn't have any clans. Why not add some?`);
			}

			return message.util.send({ embed });
		}
	}

	openInGame(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${tag}`;
	}

	async findAll(guild) {
		const db = mongodb.db('clashperk');
		const collection = await db.collection('clanstores')
			.find({ guild: guild.id })
			.toArray();

		return collection;
	}

	paginate(items, page = 1, pageLength = 2) {
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

module.exports = ClansCommand;
