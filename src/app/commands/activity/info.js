const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { emoji } = require('../../util/emojis');
const { mongodb } = require('../../struct/Database');

class InfoCommand extends Command {
	constructor() {
		super('info', {
			aliases: ['info', 'tracking', 'clans'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows how many clans you\'ve claimed.'
			},
			args: [
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

	async exec(message, { guild }) {
		const premium = this.client.patron.get(guild.id, 'guild', false);
		const collection = await this.findAll(guild);
		const db = mongodb.db('clashperk');
		const data = await Promise.all(collection.map(async item => {
			const donationlog = await db.collection('donationlogs').findOne({ clan_id: item._id });
			const playerlog = await db.collection('playerlogs').findOne({ clan_id: item._id });
			const onlinelog = await db.collection('lastonlinelogs').findOne({ clan_id: item._id });

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
					: null
			};
		}));

		if (data) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${guild.name}`, guild.iconURL());
			if (data.length) {
				embed.setDescription([
					`${premium ? `**Subscription** \nActive ${emoji.authorize}` : ''}`,
					'',
					data.map((item, index) => {
						const donationlog = this.client.channels.cache.has(item.donationlog);
						const playerlog = this.client.channels.cache.has(item.playerlog);
						const onlinelog = this.client.channels.cache.has(item.onlinelog);
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
								: ''
						];
						return [
							`**[${item.name} (${item.tag})](${this.openInGame(item.tag)})**`,
							`${logs[0].length ? `**DonationLog**\n${logs[0]}` : ''}`,
							`${logs[1].length ? `**PlayerLog**\n${logs[1]}` : ''}`,
							`${logs[2].length ? `**Last-Online Board**\n${logs[2]}` : ''}`
						].filter(item => item.length).join('\n');
					}).join('\n\n')
				]);
			}
			embed.setFooter(`${data.length} ${data.length === 1 ? 'clan' : 'clans'}${data.length ? '' : '. why not add some?'}`);
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
}

module.exports = InfoCommand;
