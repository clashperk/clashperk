const { Listener } = require('discord-akairo');

class MissingPermissionsListener extends Listener {
	constructor() {
		super('missingPermissions', {
			event: 'missingPermissions',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	exec(message, command, type, missing) {
		const text = {
			client: () => {
				const name = this.missingPermissions(message.channel, this.client.user, missing);
				return `I'm missing ${name} to use that command.`;
			},
			user: () => {
				const name = this.missingPermissions(message.channel, message.author, missing);
				return `You are missing ${name} to use that command.`;
			}
		}[type];

		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ ${type}Permissions`, { label });

		if (!text) return;
		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			return message.channel.send(text());
		}
	}

	missingPermissions(channel, user, permissions) {
		const missingPerms = channel.permissionsFor(user).missing(permissions)
			.map(name => {
				if (name === 'VIEW_CHANNEL') return '`Read Messages`';
				if (name === 'SEND_TTS_MESSAGES') return '`Send TTS Messages`';
				if (name === 'USE_VAD') return '`Use VAD`';
				if (name === 'MANAGE_GUILD') return '`Manage Server`';
				return `\`${name.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}\``;
			});

		return missingPerms.length > 1
			? `${missingPerms.slice(0, -1).join(', ')} and ${missingPerms.slice(-1)[0]} permissions`
			: `${missingPerms[0]} permission`;
	}
}

module.exports = MissingPermissionsListener;
