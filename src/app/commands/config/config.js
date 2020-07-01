const { Command } = require('discord-akairo');
const { emoji } = require('../../util/emojis');

class ConfigCommand extends Command {
	constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			channel: 'guild',
			cooldown: 3000,
			description: {
				content: 'Displays settings of the guild.',
				examples: ['']
			}
		});
	}

	exec(message) {
		const color = this.client.settings.get(message.guild, 'displayColor', null);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`Settings of ${message.guild.name}`)
			.addField('Prefix', this.handler.prefix(message))
			.addField('Patron', this.client.patron.get(message.guild.id, 'guild', false) ? `Active ${emoji.authorize}` : 'None')
			.addField('Color', color ? `#${color.toString(16)}` : null || `#${0x5970c1.toString(16)} (default)`);

		return message.util.send({ embed });
	}
}

module.exports = ConfigCommand;
