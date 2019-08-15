const { Argument, Command } = require('discord-akairo');

class PrefixCommand extends Command {
	constructor() {
		super('prefix', {
			aliases: ['prefix'],
			category: 'config',
			channel: 'guild',
			quoted: false,
			args: [
				{
					id: 'prefix',
					type: Argument.validate('string', (msg, p) => !/\s/.test(p) && p.length <= 3),
					prompt: {
						retry: 'please provide a prefix without spaces and less than 3 characters.',
						optional: true
					}
				}
			],
			description: {
				content: 'Displays or changes the prefix of the guild.',
				usage: '<prefix>',
				examples: ['!', '?']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	exec(message, { prefix }) {
		if (!prefix) {
			return message.util.send(`The current prefix for this guild is \`${this.handler.prefix(message)}\``);
		}
		if (prefix && !message.member.permissions.has('MANAGE_GUILD')) {
			return message.util.send([
				`The current prefix for this guild is \`${this.handler.prefix(message)}\``,
				'You are missing `Manage Server` to change the prefix.'
			]);
		}
		this.client.settings.set(message.guild, 'prefix', prefix);
		if (prefix === this.handler.prefix(message)) {
			return message.util.reply(`the prefix has been reset to \`${prefix}\``);
		}
		return message.util.reply(`the prefix has been set to \`${prefix}\``);
	}
}

module.exports = PrefixCommand;
