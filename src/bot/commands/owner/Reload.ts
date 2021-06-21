import { TextChannel, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import Client from '../../struct/Client';

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
			// @ts-expect-error
			(client: Client) => {
				client.commandHandler.removeAll();
				client.commandHandler.loadAll();
				client.listenerHandler.removeAll();
				client.listenerHandler.loadAll();
				client.inhibitorHandler.removeAll();
				client.inhibitorHandler.loadAll();
				return 0;
			}
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
				return message.util!.send({ embeds: [embed] });
			}
			return message.util!.send(`**${embed.title}**\n${embed.description}`);
		}
	}
}
