const { Command } = require('discord-akairo');

class LatestCommand extends Command {
	constructor() {
		super('latest', {
			aliases: ['latest', 'releases', 'release', 'new', 'version'],
			category: 'util',
			description: {
				content: 'Shows recent updates.'
			}
		});
	}

	async exec(message) {
		const channel = this.client.channels.get('582454702608744453');
		const one = await channel.messages.fetch('593752625741168656');
		const two = await channel.messages.fetch('593812779694293015');
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.addField('Latest Release', two.content.replace(/~~@everyone~~/g, ''))
			.addField('\u200b', one.content.replace(/~~@everyone~~/g, ''));

		return message.util.send({ embed });
	}
}

module.exports = LatestCommand;
