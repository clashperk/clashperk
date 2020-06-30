const { Command } = require('discord-akairo');
const { emoji } = require('../../util/emojis');

class ConfigCommand extends Command {
	constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			channel: 'guild',
			cooldown: 1000,
			description: {
				content: 'Displays settings of the guild.',
				examples: ['']
			}
		});
	}

	exec(message) {
		const restrict = this.client.settings.get(message.guild, 'restrict', []);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`Settings of ${message.guild.name}`)
			.addField('Prefix', this.handler.prefix(message))
			.addField('Subscription', this.client.patron.get(message.guild.id, 'guild', false) ? `Active ${emoji.authorize}` : 'None')
			.addField('Restriction', restrict.join(', ') || 'None');

		return message.util.send({ embed });
	}
}

module.exports = ConfigCommand;
