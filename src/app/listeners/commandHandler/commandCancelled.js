const { Listener } = require('discord-akairo');

class CommandCancelledListener extends Listener {
	constructor() {
		super('commandCancelled', {
			event: 'commandCancelled',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	async exec(message, command) {
		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ commandCancelled`, { label });

		// Counters
		this.counter(message, command);
	}

	counter(message, command) {
		this.client.firebase.counter();
		if (command.category.id === 'owner') return;
		if (this.client.isOwner(message.author.id)) return;
		this.client.firebase.commandcounter();
		this.client.firebase.users(message.author.id);
		if (command.id !== 'rank') this.client.firebase.ranks(message.author.id);
		this.client.firebase.commands(command.id);
		if (message.guild) this.client.firebase.guilds(message.guild.id);
	}
}

module.exports = CommandCancelledListener;
