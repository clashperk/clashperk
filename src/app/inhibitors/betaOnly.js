const { Inhibitor } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class BetaInhibitor extends Inhibitor {
	constructor() {
		super('beta', {
			reason: 'beta'
		});
	}

	exec(message) {
		const color = this.client.settings.get(message.guild, 'displayColor', null);
		/* eslint-disable func-name-matching */
		Object.defineProperty(MessageEmbed.prototype, 'setColor', {
			value: function setColor(colour) {
				if (!color) this.color = colour;
				else this.color = color;
				return this;
			}
		});

		if (this.client.isOwner(message.author.id)) return false;
		if (message.util.parsed && message.util.parsed.command && message.util.parsed.command.categoryID !== 'beta') return false;
		const restrict = this.client.settings.get('global', 'beta', []);
		return !restrict.includes(message.author.id);
	}
}

module.exports = BetaInhibitor;
