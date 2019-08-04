const { Command } = require('discord-akairo');
const { firebaseApp } = require('../../struct/Database');
const { MessageEmbed } = require('discord.js');

class TrackingCommand extends Command {
	constructor() {
		super('tracking', {
			aliases: ['tracking', 'clans'],
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
						const guild = this.client.guilds.get(id);
						if (!guild) return null;
						return guild;
					},
					default: message => message.guild
				}
			]
		});
	}

	async exec(message, { guild }) {
		const ref = await firebaseApp.database().ref().child('clans')
			.orderByChild('guild')
			.equalTo(message.guild.id);
		const object = await ref.once('value').then(snap => snap.val());
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL());
		const data = this.values(object);

		if (data.length) {
			embed.setDescription([
				data.map(({ name, tag, channel }, index) => `**${++index}.** ${name} (${tag}) => <#${channel}>`).join('\n')
			]);
		}
		embed.setFooter(`Tracking ${data.length} ${data.length > 1 || data.length === 0 ? 'clans' : 'clan'}`);
		return message.util.send({ embed });
	}

	values(object) {
		if (!object) return Object.values({});
		return Object.values(object);
	}
}

module.exports = TrackingCommand;
