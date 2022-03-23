import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { Flags } from '../../util/Constants';

export default class ServerLinkCommand extends Command {
	public constructor() {
		super('setup-server-link', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			userPermissions: ['MANAGE_GUILD'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag: string }) {
		const clan = await this.client.storage.collection.findOne({ tag: args.tag, guild: interaction.guild.id });
		if (clan) return interaction.editReply(`**${clan.name} (${clan.tag})** is already linked to ${interaction.guild.name}`);

		const data = await this.client.resolver.enforceSecurity(interaction, args.tag);
		if (!data) return;

		const id = await this.client.storage.register(interaction, {
			op: Flags.SERVER_LINKED,
			guild: interaction.guild.id,
			name: data.name,
			tag: data.tag
		});

		await this.client.rpcHandler.add(id, {
			op: Flags.CHANNEL_LINKED,
			tag: data.tag,
			guild: interaction.guild.id
		});

		return interaction.editReply(`Successfully linked **${data.name} (${data.tag})** to **${interaction.guild.name}**`);
	}
}
