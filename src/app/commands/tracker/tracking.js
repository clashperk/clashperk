const { Command } = require('discord-akairo');
const Clans = require('../../models/Clans');
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
		const data = await Clans.findAll({ where: { guild: guild.id } });
		if (data) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL());
			if (data.length) {
				embed.setDescription([
					data.map(({ name, tag, channel }, index) => `**${++index}.** ${name} (${tag}) => <#${channel}>`).join('\n')
				]);
			}
			embed.setFooter(`Tracking ${data.length} ${data.length > 1 || data.length === 0 ? 'clans' : 'clan'}`);
			return message.util.send({ embed });
		}
	}
}

module.exports = TrackingCommand;
