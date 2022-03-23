import { Interaction } from 'discord.js';
import { Inhibitor } from '../lib';

export default class PermissionInhibitor extends Inhibitor {
	public constructor() {
		super('permission', {
			reason: 'permission',
			priority: 10
		});
	}

	public exec(interaction: Interaction) {
		if (interaction.inGuild() && !interaction.inCachedGuild()) return true;
		if (!interaction.inCachedGuild()) return false;
		if (!interaction.channel) return false;

		if (interaction.channel.isThread()) {
			return !interaction.channel.permissionsFor(this.client.user!)?.has(['SEND_MESSAGES_IN_THREADS']);
		}
		return !interaction.channel.permissionsFor(this.client.user!)?.has(['SEND_MESSAGES', 'VIEW_CHANNEL']);
	}
}
