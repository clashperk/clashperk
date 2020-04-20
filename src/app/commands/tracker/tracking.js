const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore } = require('../../struct/Database');
const { stripIndents } = require('common-tags');
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
		const premium = this.client.patron.get(message.guild.id, 'guild', false);
		if (data) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${guild.name} ${premium ? emoji.authorize : ''}`, guild.iconURL());
			if (data.length) {
				embed.setDescription([
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
									? `${emoji.ok} Enabled \n${emoji.channel} <#${donationlog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${donationlog}>`
								: '',
							memberlog
								? member_log
									? `${emoji.ok} Enabled \n${emoji.channel} <#${memberlog}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${memberlog}>`
								: '',
							lastonline
								? lastonline_log
									? `${emoji.ok} Enabled \n${emoji.channel} <#${lastonline}>`
									: `${emoji.wrong} Disabled \n${emoji.channel} <#${lastonline}>`
								: ''
						];
						return [
							`**${this.padStart(++index)} » ${data.name} (${data.tag})**`,
							'\u2002',
							`${logs[0].length ? `**DonationLog**\n${logs[0]}` : ''}`,
							`${logs[1].length ? `**PlayerLog**\n${logs[1]}` : ''}`,
							`${logs[2].length ? `**Last-Online Board**\n${logs[2]}` : ''}`
						].filter(item => item.length).join('');
					}).join('\n\n')
				]);
			}
			embed.setFooter(`Tracking ${data.length} ${data.length > 1 || data.length === 0 ? 'clans' : 'clan'}`);
			return message.util.send({ embed });
		}
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
