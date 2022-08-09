import { stringify } from 'querystring';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../lib/index.js';
import { BIT_FIELD } from '../../util/Constants.js';

export default class InviteCommand extends Command {
	public constructor() {
		super('invite', {
			category: 'config',
			description: { content: 'Get support server and bot invite link.' },
			defer: false
		});
	}

	public exec(interaction: CommandInteraction<'cached'>) {
		const query = stringify({
			client_id: this.client.user!.id,
			scope: 'bot applications.commands',
			permissions: BIT_FIELD.toString()
		});

		const embed = new MessageEmbed()
			.setAuthor({ name: this.client.user!.username, iconURL: this.client.user!.displayAvatarURL({ format: 'png' }) })
			.setDescription(
				[
					'ClashPerk can be added to as many servers as you want! Please share the bot with your friends. Thanks in advance!',
					'',
					`**[Add to Discord](https://discord.com/api/oauth2/authorize?${query})**`,
					'',
					'**[Support Discord](https://discord.gg/ppuppun)** | **[Become a Patron](https://www.patreon.com/clashperk)**'
				].join('\n')
			);

		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
