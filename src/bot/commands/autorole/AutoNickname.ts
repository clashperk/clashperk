import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { title } from 'radash';
import { NicknamingAccountPreference } from '../../core/RolesManager.js';
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
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			change_nicknames?: boolean;
			family_nickname_format?: string;
			non_family_nickname_format?: string;
			account_preference_for_naming?: NicknamingAccountPreference;
		}
	) {
		let familyFormat = this.client.settings.get<string>(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, '');
		if (args.family_nickname_format && familyFormat !== args.family_nickname_format) familyFormat = args.family_nickname_format;

		let nonFamilyFormat = this.client.settings.get<string>(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, '');
		if (args.non_family_nickname_format && nonFamilyFormat !== args.non_family_nickname_format)
			nonFamilyFormat = args.non_family_nickname_format;

		if (args.family_nickname_format && !/^none$/i.test(args.family_nickname_format)) {
			if (/{NAME}|{PLAYER_NAME}|{DISCORD_NAME}|{DISCORD_USERNAME}|{USERNAME}|{DISCORD}/gi.test(familyFormat)) {
				this.client.settings.set(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, familyFormat);
			} else {
				return interaction.editReply(
					`Invalid **family nickname** format \`${familyFormat}\`, it must include \`{PLAYER_NAME}\` or \`{DISCORD_NAME}\` or \`{DISCORD_USERNAME}\``
				);
			}
		}

		if (args.family_nickname_format && /^none$/i.test(args.family_nickname_format)) {
			this.client.settings.set(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, '');
		}

		if (args.non_family_nickname_format && !/^none$/i.test(args.non_family_nickname_format)) {
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

		if (args.non_family_nickname_format && /^none$/i.test(args.non_family_nickname_format)) {
			this.client.settings.set(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, '');
		}

		if (typeof args.change_nicknames === 'boolean') {
			await this.client.settings.set(interaction.guildId, Settings.AUTO_NICKNAME, Boolean(args.change_nicknames));
		}
		const enabledAuto = this.client.settings.get<boolean>(interaction.guildId, Settings.AUTO_NICKNAME, false);

		if (args.account_preference_for_naming) {
			await this.client.settings.set(interaction.guildId, Settings.NICKNAMING_ACCOUNT_PREFERENCE, args.account_preference_for_naming);
		}

		const accountPreference = this.client.settings.get<NicknamingAccountPreference>(
			interaction.guildId,
			Settings.NICKNAMING_ACCOUNT_PREFERENCE,
			NicknamingAccountPreference.DEFAULT_ACCOUNT
		);

		const embed = new EmbedBuilder().setAuthor({ name: 'Server Nickname Settings' }).setColor(this.client.embed(interaction));
		embed.addFields({ name: 'Family Nickname Format', value: `\`${familyFormat || 'None'}\`` });
		embed.addFields({ name: 'Non-Family Nickname Format', value: `\`${nonFamilyFormat || 'None'}\`` });
		embed.addFields({ name: 'Change Nicknames', value: `\`${enabledAuto ? 'Yes' : 'No'}\`` });
		embed.addFields({ name: 'Account Preference', value: `\`${title(accountPreference)}\`` });
		embed.addFields({
			name: '\u200b',
			value: [
				'**Available Variables**',
				`\`{NAME}\` or \`{PLAYER_NAME}\``,
				`\`{TH}\` or \`{TOWN_HALL}\``,
				`\`{TH_SMALL}\` or \`{TOWN_HALL_SMALL}\``,
				`\`{ROLE}\` or \`{CLAN_ROLE}\``,
				`\`{ALIAS}\` or \`{CLAN_ALIAS}\``,
				`\`{CLAN}\` or \`{CLAN_NAME}\``,
				`\`{DISCORD}\` or \`{DISCORD_NAME}\``,
				`\`{USERNAME}\` or \`{DISCORD_USERNAME}\``,
				'',
				'**Example Formats**',
				`\`{NAME} | {TH} | {ROLE}\``,
				`\`{ROLE} | {TH} | {NAME}\``,
				`\`{NAME} | {TH} | {ALIAS}\``,
				'',
				`Run ${this.client.commands.AUTOROLE_REFRESH} to refresh nicknames.`
			].join('\n')
		});

		return interaction.editReply({ embeds: [embed] });
	}
}
