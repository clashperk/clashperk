const { Command } = require('discord-akairo');
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
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL());
		const clans = await this.client.tracker.clans(message.guild.id);

		if (clans.length) {
			embed.setDescription([
				clans.map(({ name, tag, channel }, index) => `**${++index}.** ${name} (${tag}) => <#${channel}>`).join('\n')
			]);
		}
		embed.setFooter(`Tracking ${clans.length} ${clans.length > 1 || clans.length === 0 ? 'clans' : 'clan'}`);
		return message.util.send({ embed });
	}

	values(object) {
		if (!object) return Object.values({});
		return Object.values(object);
	}
}

module.exports = TrackingCommand;
