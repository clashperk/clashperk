const { Command } = require('discord-akairo');

class ReloadCommand extends Command {
	constructor() {
		super('reload', {
			aliases: ['reload', 'r'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	async exec(message) {
		await this.client.shard.broadcastEval(
			`[
				this.client.inhibitorHandler.removeAll(),
				this.client.listenerHandler.removeAll(),
				this.client.commandHandler.removeAll(),
				this.client.inhibitorHandler.loadAll(),
				this.client.listenerHandler.loadAll(),
				this.client.commandHandler.loadAll()
			]`
		).catch(() => null);
		const cmd = this.client.commandHandler.modules.size;
		const listener = this.client.listenerHandler.modules.size;
		const inhibitor = this.client.inhibitorHandler.modules.size;
		return message.util.send({
			embed: {
				color: 3093046,
				description: `Reloaded ${cmd} commands, ${listener} listeners & ${inhibitor} inhibitors`
			}
		});
	}
}

module.exports = ReloadCommand;
