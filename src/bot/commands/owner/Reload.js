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
		const reloaded = await this.client.shard.broadcastEval(
			`
			this.commandHandler.removeAll() && this.commandHandler.loadAll();
			this.listenerHandler.removeAll() && this.listenerHandler.loadAll();
			this.inhibitorHandler.removeAll() && this.inhibitorHandler.loadAll();
			`
		).catch(() => null);

		if (reloaded) {
			const commands = this.client.commandHandler.modules.size;
			const listeners = this.client.listenerHandler.modules.size;
			const inhibitors = this.client.inhibitorHandler.modules.size;
			const embed = {
				title: `Reloaded (Shard ${message.guild.shard.id}/${this.client.shard.count})`,
				description: `${commands} commands, ${listeners} listeners and ${inhibitors} inhibitors`
			};
			if (message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) {
				return message.util.send({ embed });
			}
			return message.util.send([`**${embed.title}**`, `${embed.description}`]);
		}
	}
}

module.exports = ReloadCommand;
