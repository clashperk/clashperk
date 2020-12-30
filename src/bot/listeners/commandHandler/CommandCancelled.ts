import { Listener, Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class CommandCancelledListener extends Listener {
	public constructor() {
		super('commandCancelled', {
			event: 'commandCancelled',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(message: Message, command: Command) {
		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ commandCancelled`, { label });

		// Counters
		return this.counter(message, command);
	}

	private counter(message: Message, command: Command) {
		this.client.stats.counter();
		if (command.category.id === 'owner') return;
		if (this.client.isOwner(message.author.id)) return;
		this.client.stats.users(message.author.id);
		this.client.stats.commands(command.id);
		if (message.guild) this.client.stats.guilds(message.guild.id);
	}
}