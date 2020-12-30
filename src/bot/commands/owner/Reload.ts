import { TextChannel, Message } from 'discord.js';
import { Command } from 'discord-akairo';

export default class ReloadCommand extends Command {
	public constructor() {
		super('reload', {
			aliases: ['reload', 'r'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	public async exec(message: Message) {
		const reloaded = await this.client.shard!.broadcastEval(
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
				title: `Reloaded (Shard ${message.guild!.shard.id}/${this.client.shard!.count})`,
				description: `${commands} commands, ${listeners} listeners and ${inhibitors} inhibitors`
			};
			if ((message.channel as TextChannel).permissionsFor(message.guild!.me!)!.has('EMBED_LINKS')) {
				return message.util!.send({ embed });
			}
			return message.util!.send([`**${embed.title}**`, `${embed.description}`]);
		}
	}
}
