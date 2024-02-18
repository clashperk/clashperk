import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

// {NAME} | {PLAYER_NAME}
// {TH} | {TOWN_HALL}
// {TH_SMALL} | {TOWN_HALL_SMALL}
// {ROLE} | {CLAN_ROLE}
// {ALIAS} | {CLAN_ALIAS}
// {CLAN} | {CLAN_NAME}
// {DISCORD} | {DISCORD_NAME}
// {USERNAME} | {DISCORD_USERNAME}

export default class NicknameConfigCommand extends Command {
	public constructor() {
		super('nickname-config', {
			category: 'setup',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageNicknames'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			enable_auto?: boolean;
			family_nickname_format?: string;
			non_family_nickname_format?: string;
		}
	) {
		let familyFormat = this.client.settings.get<string>(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, '{NAME}');
		if (args.family_nickname_format && familyFormat !== args.family_nickname_format) familyFormat = args.family_nickname_format;

		let nonFamilyFormat = this.client.settings.get<string>(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, '');
		if (args.non_family_nickname_format && nonFamilyFormat !== args.non_family_nickname_format)
			nonFamilyFormat = args.non_family_nickname_format;

		if (args.family_nickname_format) {
			if (/{NAME}/gi.test(familyFormat)) {
				this.client.settings.set(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, familyFormat);
			} else {
				return interaction.editReply(
					`Invalid **family nickname** format \`${familyFormat}\`, it must include \`{NAME}\` or \`{PLAYER_NAME}\``
				);
			}
		}

		if (args.non_family_nickname_format) {
			if (/{CLAN}|{CLAN_NAME}|{ALIAS}|{CLAN_ALIAS}|{ROLE}|{CLAN_ROLE}/gi.test(nonFamilyFormat)) {
				return interaction.editReply(
					`Invalid **non-family nickname** format \`${nonFamilyFormat}\`, it must **not** include \`{CLAN}\` \`{CLAN_NAME}\` \`{ALIAS}\` \`{CLAN_ALIAS}\` \`{ROLE}\` \`{CLAN_ROLE}\``
				);
			} else if (!/{NAME}/gi.test(nonFamilyFormat)) {
				return interaction.editReply(
					`Invalid **non-family nickname** format \`${familyFormat}\`, it must include \`{NAME}\` or \`{PLAYER_NAME}\``
				);
			} else {
				this.client.settings.set(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, nonFamilyFormat);
			}
		}

		if (typeof args.enable_auto === 'boolean') {
			await this.client.settings.set(interaction.guildId, Settings.AUTO_NICKNAME, Boolean(args.enable_auto));
		}
		const enabledAuto = this.client.settings.get<boolean>(interaction.guildId, Settings.AUTO_NICKNAME, false);

		const embed = new EmbedBuilder().setAuthor({ name: 'Server Nickname Settings' }).setColor(this.client.embed(interaction));
		embed.addFields({ name: 'Family Nickname Format', value: `\`${familyFormat || 'None'}\`` });
		embed.addFields({ name: 'Non-Family Nickname Format', value: `\`${nonFamilyFormat || 'None'}\`` });
		embed.addFields({ name: 'Auto Mode', value: `\`${enabledAuto ? 'Yes' : 'No'}\`` });
		embed.addFields({
			name: 'Available Formats',
			value: [
				`\`{NAME}\` / \`{PLAYER_NAME}\``,
				`\`{TH}\` / \`{TOWN_HALL}\``,
				`\`{TH_SMALL}\` / \`{TOWN_HALL_SMALL}\``,
				`\`{ROLE}\` / \`{CLAN_ROLE}\``,
				`\`{ALIAS}\` / \`{CLAN_ALIAS}\``,
				`\`{CLAN}\` / \`{CLAN_NAME}\``,
				`\`{DISCORD}\` / \`{DISCORD_NAME}\``,
				`\`{USERNAME}\` / \`{DISCORD_USERNAME}\``
			].join('\n')
		});

		return interaction.editReply({ embeds: [embed] });
	}
}
