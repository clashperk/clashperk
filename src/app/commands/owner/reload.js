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
		const inhibitor = this.client.inhibitorHandler.removeAll() && this.client.inhibitorHandler.loadAll();
		const listener = this.client.listenerHandler.removeAll() && this.client.listenerHandler.loadAll();
		const command = this.client.commandHandler.removeAll() && this.client.commandHandler.loadAll();

		if (inhibitor && listener && command) {
			const cmd = await this.client.commandHandler.modules.size;
			const listener = await this.client.listenerHandler.modules.size;
			const inhibitor = await this.client.inhibitorHandler.modules.size;
			const embed = {
				title: `Reloaded (Shard ${message.guild.shard.id}/${this.client.shard.count})`,
				description: `${cmd} commands, ${listener} listeners & ${inhibitor} inhibitors`
			};
			if (message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) {
				return message.util.send({ embed });
			}
			return message.util.send([`**${embed.title}**`, `${embed.description}`]);
		}
	}
}

module.exports = ReloadCommand;
