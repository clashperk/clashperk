const { Command } = require('discord-akairo');

class PatronCommand extends Command {
	constructor() {
		super('patron', {
			aliases: ['patron'],
			category: 'owner',
			channel: 'guild',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	*args() {
		const type = yield {
			type: ['user', 'guild']
		};

		const data = yield {
			type: (msg, id) => {
				if (!id) return null;
				const resolver = this.handler.resolver.type({
					user: 'user_',
					guild: 'guild_'
				}[type]);
				return resolver(msg, id);
			},
			prompt: {
				start: 'what is the ID of user or guild?',
				retry: 'please provide a valid user ID or guild ID.'
			}
		};

		const limit = yield (
			// eslint-disable-next-line multiline-ternary
			type === 'guild' ? {
				type: 'number',
				prompt: {
					start: 'what is the limit for this guild?'
				}
			} : {
				match: 'none'
			}
		);

		return { type, data, limit };
	}

	async exec(message, { type, data: guild, data: user, limit }) {
		if (!type) return;

		if (type === 'user') {
			this.client.patron.users.set(user, 'patron', true);
			const embed = this.client.util.embed()
				.setAuthor('Patron')
				.setDescription(user.tag);
			return message.util.send({ embed });
		}

		if (type === 'guild') {
			this.client.patron.guilds.set(guild, 'patron', true);
			this.client.patron.guilds.set(guild, 'clanLimit', limit);
			const embed = this.client.util.embed()
				.setAuthor('Patron')
				.setDescription(guild.name)
				.setFooter(`Limit ${limit}`, guild.iconURL());
			return message.util.send({ embed });
		}
	}
}

module.exports = PatronCommand;
