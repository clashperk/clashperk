import { Interaction } from 'discord.js';
import { Command, Inhibitor } from '../lib/index.js';

export default class PermissionInhibitor extends Inhibitor {
	public constructor() {
		super('permission', {
			reason: 'permission',
			priority: 10
		});
	}

	public exec(interaction: Interaction, command: Command): boolean {
		if (!interaction.inCachedGuild() && command.channel === 'dm') return false;

		if (interaction.inGuild() && !interaction.inCachedGuild()) return true;
		if (!interaction.inCachedGuild()) return true;
		if (!interaction.channel) return true;

		return false;

		// if (interaction.channel.isThread()) {
		// 	return !interaction.appPermissions.has([PermissionFlagsBits.SendMessagesInThreads]);
		// }

		// return !interaction.appPermissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]);
	}
}
