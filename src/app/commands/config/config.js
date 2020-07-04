const { Command } = require('discord-akairo');
const { emoji } = require('../../util/emojis');

class ConfigCommand extends Command {
	constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			channel: 'guild',
			description: {
				content: 'Displays settings of the guild.',
				examples: ['']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	exec(message) {
		const color = this.client.settings.get(message.guild, 'color', null);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`Settings of ${message.guild.name}`)
			.addField('Prefix', this.handler.prefix(message))
			.addField('Patron', this.client.patron.get(message.guild.id, 'guild', false) ? `Active ${emoji.authorize}` : 'None')
			.addField('Color', color ? `#${color.toString(16)}` : null || `#${0x5970c1.toString(16)} (default)`);

		return message.util.send({ embed });
	}
}

module.exports = ConfigCommand;
