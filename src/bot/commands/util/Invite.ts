import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { getInviteLink } from '../../util/Constants.js';

export default class InviteCommand extends Command {
	public constructor() {
		super('invite', {
			category: 'config',
			description: { content: 'Get support server and bot invite link.' },
			channel: 'dm',
			defer: false
		});
	}

	public exec(interaction: CommandInteraction<'raw'>) {
		const embed = new EmbedBuilder()
			.setAuthor({ name: this.client.user!.displayName, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
			.setDescription(
				[
					'ClashPerk can be added to as many servers as you want! Please share the bot with your friends. Thanks in advance!',
					'',
					`**[Add to Discord](${getInviteLink(this.client.user!.id)})**`,
					'',
					'**[Support Discord](https://discord.gg/ppuppun)** | **[Become a Patron](https://www.patreon.com/clashperk)**'
				].join('\n')
			);
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
