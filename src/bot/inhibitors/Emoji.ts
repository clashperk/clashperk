import { Interaction } from 'discord.js';
import { Command, Inhibitor } from '../lib';

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
		if (!command.clientPermissions?.includes('USE_EXTERNAL_EMOJIS')) return false;

		// return interaction.appPermissions!.has('USE_EXTERNAL_EMOJIS');

		return !interaction.channel.permissionsFor(interaction.guild.roles.everyone).has('USE_EXTERNAL_EMOJIS');
	}
}
