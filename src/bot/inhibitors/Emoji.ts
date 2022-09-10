import { Interaction, PermissionFlagsBits } from 'discord.js';
import { Command, Inhibitor } from '../lib/index.js';

export default class GuildBanInhibitor extends Inhibitor {
	public constructor() {
		super('external-emoji', {
			reason: 'emoji',
			priority: 3
		});
	}

	public exec(interaction: Interaction, command: Command) {
		if (!interaction.inCachedGuild()) return false;
		if (!interaction.channel) return false;
		if (!command.clientPermissions?.includes('UseExternalEmojis')) return false;
		return !interaction.channel.permissionsFor(interaction.guild.roles.everyone).has(PermissionFlagsBits.UseExternalEmojis);
	}
}
