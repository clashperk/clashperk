import { Message, Snowflake, User } from 'discord.js';
import { Command } from 'discord-akairo';

export default class BlacklistCommand extends Command {
	public constructor() {
		super('blacklist', {
			aliases: ['blacklist', 'unblacklist'],
			description: {
				content: 'You can\'t use this anyway, so why explain?',
				usage: '<user>',
				examples: ['81440962496172032']
			},
			category: 'owner',
			ownerOnly: true,
			args: [
				{
					id: 'user',
					match: 'content',
					type: async (msg, id) => {
						if (!id) return null;
						return this.client.users.fetch(id as Snowflake).catch(() => null);
					},
					prompt: {
						start: 'Who would you like to blacklist/unblacklist?',
						retry: 'Please provide a valid userId.'
					}
				}
			]
		});
	}

	public exec(message: Message, { user }: { user: User }) {
		const blacklist = this.client.settings.get<string[]>('global', 'blacklist', []);
		if (blacklist.includes(user.id)) {
			const index = blacklist.indexOf(user.id);
			blacklist.splice(index, 1);
			if (blacklist.length === 0) this.client.settings.delete('global', 'blacklist');
			else this.client.settings.set('global', 'blacklist', blacklist);

			return message.util!.send(`**${user.tag}** has been removed from the ${this.client.user!.username}'s blacklist.`);
		}

		blacklist.push(user.id);
		this.client.settings.set('global', 'blacklist', blacklist);

		return message.util!.send(`**${user.tag}** has been blacklisted from using ${this.client.user!.username}'s command.`);
	}
}
