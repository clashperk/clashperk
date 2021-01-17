import { MessageEmbed } from 'discord.js';
import Client from './Client';

interface WebhookMessage {
	content: string;
	username: string;
	avatarURL: string;
	embeds: MessageEmbed[];
}

export default class Wehbook {
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	public post(id: string, token: string, data: WebhookMessage) {
		// @ts-expect-error
		return this.client.api.webhooks(id, token)
			.post({
				data,
				query: { wait: true },
				auth: false
			});
	}

	public patch(id: string, token: string, message: string, data: { content: string; embeds: MessageEmbed[] }) {
		// @ts-expect-error
		return this.client.api.webhooks(id, token)
			.messages[message]
			.patch({
				data,
				query: { wait: true },
				auth: false
			});
	}
}
