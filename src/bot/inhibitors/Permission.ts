import { Interaction } from 'discord.js';
import { Inhibitor } from '../lib/index.js';

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
			return !interaction.appPermissions?.has(['SEND_MESSAGES_IN_THREADS']);
		}
		return !interaction.appPermissions?.has(['SEND_MESSAGES', 'VIEW_CHANNEL']);
	}
}
