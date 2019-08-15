const { Command } = require('discord-akairo');

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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	exec(message) {
		const restrict = this.client.settings.get(message.guild, 'restrict', []);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`Settings of ${message.guild.name}`)
			.addField('prefix', this.handler.prefix(message))
			.addField('Restriction', restrict.join(', ') || 'None');

		return message.util.send({ embed });
	}
}

module.exports = ConfigCommand;
