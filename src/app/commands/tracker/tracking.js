const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');

class TrackingCommand extends Command {
	constructor() {
		super('tracking', {
			aliases: ['info', 'tracking', 'clans'],
			category: 'tracker',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows all tracking details.'
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
		const data = await this.findAll(guild);
		const premium = this.client.patron.get(guild.id, 'guild', false);
		if (data) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${guild.name}`, guild.iconURL());
			if (data.length) {
				embed.setDescription([
					`\u200e${premium ? `**Subscription** \nActive ${emoji.authorize}` : ''}`,
					'',
					data.map((data, index) => {
						const donationlog = data.donationlog
							? data.donationlog.channel
							: null;
						const memberlog = data.memberlog
							? data.memberlog.channel
							: null;
						const lastonline = data.lastonline
							? data.lastonline.channel
							: null;

						const donation_log = this.client.channels.cache.has(donationlog);
						const member_log = this.client.channels.cache.has(memberlog);
						const lastonline_log = this.client.channels.cache.has(lastonline);
						const logs = [
							donationlog
								? donation_log
									? `${this.space()} ${emoji.ok} Enabled \n${this.space()} ${emoji.channel} <#${donationlog}>`
									: `\u200b \u2002 ${emoji.wrong} Disabled \n\u200b \u2002 ${emoji.channel} <#${donationlog}>`
								: '',
							memberlog
								? member_log
									? `\u200b \u2002 ${emoji.ok} Enabled \n\u200b \u2002 ${emoji.channel} <#${memberlog}>`
									: `\u200b \u2002 ${emoji.wrong} Disabled \n\u200b \u2002 ${emoji.channel} <#${memberlog}>`
								: '',
							lastonline
								? lastonline_log
									? `\u200b \u2002 ${emoji.ok} Enabled \n\u200b \u2002 ${emoji.channel} <#${lastonline}>`
									: `\u200b \u2002 ${emoji.wrong} Disabled \n\u200b \u2002 ${emoji.channel} <#${lastonline}>`
								: ''
						];
						return [
							`**${this.padStart(++index)}. [${data.name} (${data.tag})](${this.openInGame(data.tag)})**`,
							`${logs[0].length ? `\u200b \u2002 **DonationLog**\n${logs[0]}` : ''}`,
							`${logs[1].length ? `\u200b \u2002 **PlayerLog**\n${logs[1]}` : ''}`,
							`${logs[2].length ? `\u200b \u2002 **Last-Online Board**\n${logs[2]}` : ''}`
						].filter(item => item.length).join('\n');
					}).join('\n\n')
				]);
			}
			embed.setFooter(`${data.length} ${data.length === 1 ? 'clan' : 'clans'}`);
			return message.util.send({ embed });
		}
	}

	openInGame(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${tag}`;
	}

	space() {
		return '\u200b'.padEnd(3, '\u2002');
	}

	padStart(num) {
		return num.toString().padStart(2, '0');
	}

	async findAll(guild) {
		const clans = [];
		await firestore.collection('tracking_clans')
			.where('guild', '==', guild.id)
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					clans.push(doc.data());
				});
			});
		return clans;
	}
}

module.exports = TrackingCommand;
