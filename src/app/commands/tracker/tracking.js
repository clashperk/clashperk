const { Command } = require('discord-akairo');
const Clans = require('../../models/Clans');
const { MessageEmbed } = require('discord.js');

class TrackingCommand extends Command {
	constructor() {
		super('tracking', {
			aliases: ['tracking', 'show-clans', 'show'],
			category: 'tracker',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows all tracking details.'
			}
		});
	}

	async exec(message) {
		const data = await Clans.findAll({ where: { guild: message.guild.id } });
		if (data) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${message.guild.name} (${message.guild.id})`, message.guild.iconURL());
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
