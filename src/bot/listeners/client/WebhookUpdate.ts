import { Listener } from 'discord-akairo';
import { TextChannel } from 'discord.js';

export default class WebhookUpdateListener extends Listener {
	public constructor() {
		super('webhookUpdate', {
			event: 'webhookUpdate',
			emitter: 'client',
			category: 'client'
		});
	}

	public exec(channel: TextChannel) {
		// await channel.guild.fetchWebhooks();
		console.log(channel.id);
	}
}
