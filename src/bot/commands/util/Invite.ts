import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings, getInviteLink } from '../../util/Constants.js';

export default class InviteCommand extends Command {
	public constructor() {
		super('invite', {
			category: 'config',
			channel: 'dm',
			defer: false
		});
	}

	public exec(interaction: CommandInteraction<'raw'>) {
		const additionalTexts = [];

		if (this.client.isCustom()) {
			const emojiServers = this.client.settings.get<string[]>('global', Settings.EMOJI_SERVERS, []);
			const guildIds = this.client.guilds.cache.map((guild) => guild.id);
			const missingServers = emojiServers.filter((id) => !guildIds.includes(id));

			const inviteLinks = missingServers.map((guildId, idx) => {
				return `[- Emoji Server (${idx + 1})](${getInviteLink(this.client.user!.id, guildId, true)})`;
			});

			if (inviteLinks.length) additionalTexts.push('**Invite to the Following Emoji Servers**');
			if (inviteLinks.length) additionalTexts.push(...inviteLinks);
		}

		const embed = new EmbedBuilder()
			.setAuthor({ name: this.client.user!.displayName, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
			.setDescription(
				[
					'ClashPerk can be added to as many servers as you want! Please share the bot with your friends. Thanks in advance!',
					'',
					`**[Add to Discord](${getInviteLink(this.client.user!.id)})**`,
					'',
					'**[Support Discord](https://discord.gg/ppuppun)** | **[Become a Patron](https://www.patreon.com/clashperk)**',
					'',
					additionalTexts.join('\n')
				].join('\n')
			);
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
