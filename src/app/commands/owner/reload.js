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
				this.inhibitorHandler.removeAll(),
				this.listenerHandler.removeAll(),
				this.commandHandler.removeAll(),
				this.inhibitorHandler.loadAll(),
				this.listenerHandler.loadAll(),
				this.commandHandler.loadAll()
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
