const { Command } = require('discord-akairo');

class ConfigCommand extends Command {
	constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			clientPermissions: ['EMBED_LINKS'],
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
		const permissions = ['ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY'];
		const color = this.client.settings.get(message.guild, 'color', null);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`Settings of ${message.guild.name}`)
			.addField('Prefix', this.handler.prefix(message))
			.addField('Patron', this.client.patron.get(message.guild.id, 'guild', false) ? 'Yes' : 'No')
			.addField('Color', color ? `#${color.toString(16)}` : null || `#${0x5970c1.toString(16).toUpperCase()} (default)`);
		if (!message.channel.permissionsFor(message.guild.me).has(permissions, false)) {
			embed.addField('Missing Permission', [
				this.missingPermissions(message.channel, this.client.user, permissions)
			]);
		}

		return message.util.send({ embed });
	}

	missingPermissions(channel, user, permissions) {
		const missingPerms = channel.permissionsFor(user).missing(permissions)
			.map(str => {
				if (str === 'VIEW_CHANNEL') return 'Read Messages';
				return str.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
			});
		return missingPerms.join('\n');
	}
}

module.exports = ConfigCommand;
