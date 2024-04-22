import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	HexColorString,
	MessageComponentInteraction,
	Role,
	StringSelectMenuBuilder,
	resolveColor
} from 'discord.js';
import { title } from 'radash';
import { command } from '../../../../locales/en.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';
import { createInteractionCollector } from '../../util/Pagination.js';

const options = [
	{
		name: 'manager_role',
		key: Settings.MANAGER_ROLE,
		description: command.config.options.manager_role.description
	},
	{
		name: 'roster_manager_role',
		key: Settings.ROSTER_MANAGER_ROLE,
		description: command.config.options.roster_manager_role.description
	},
	{
		name: 'flags_manager_role',
		key: Settings.FLAGS_MANAGER_ROLE,
		description: command.config.options.flags_manager_role.description
	},
	{
		name: 'links_manager_role',
		key: Settings.LINKS_MANAGER_ROLE,
		description: command.config.options.links_manager_role.description
	},
	{
		name: 'color_code',
		key: Settings.COLOR,
		description: command.config.options.color_code.description
	}
];

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			category: 'config',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks'],
			channel: 'guild',
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			color_code?: string;
			webhook_limit?: number;
			manager_role?: Role;
			roster_manager_role?: Role;
			flags_manager_role?: Role;
			links_manager_role?: Role;
			account_linked_role?: Role;
			account_verified_role?: Role;
			clans_sorting_key?: string;
			auto_update_roles?: boolean;
			verified_only_clan_roles?: boolean;
			/** @deprecated */
			maintenance_notification_channel?: string;
		}
	) {
		if (args.color_code) {
			await this.client.settings.set(interaction.guild, Settings.COLOR, this.getColor(args.color_code));
		}

		if (args.webhook_limit) {
			const webhookLimit = Math.max(3, Math.min(8, args.webhook_limit));
			await this.client.settings.set(interaction.guild, Settings.WEBHOOK_LIMIT, webhookLimit);
		}

		if (args.manager_role) {
			await this.client.settings.set(interaction.guild, Settings.MANAGER_ROLE, args.manager_role.id);
		}

		if (args.roster_manager_role) {
			await this.client.settings.set(interaction.guild, Settings.ROSTER_MANAGER_ROLE, args.roster_manager_role.id);
		}

		if (args.flags_manager_role) {
			await this.client.settings.set(interaction.guild, Settings.FLAGS_MANAGER_ROLE, args.flags_manager_role.id);
		}

		if (args.links_manager_role) {
			await this.client.settings.set(interaction.guild, Settings.LINKS_MANAGER_ROLE, args.links_manager_role.id);
		}

		if (args.clans_sorting_key) {
			await this.client.settings.set(interaction.guild, Settings.CLANS_SORTING_KEY, args.clans_sorting_key);
		}

		if (args.account_linked_role) {
			await this.client.settings.set(interaction.guild, Settings.ACCOUNT_LINKED_ROLE, args.account_linked_role.id);
		}

		if (args.account_verified_role) {
			await this.client.settings.set(interaction.guild, Settings.ACCOUNT_VERIFIED_ROLE, args.account_verified_role.id);
		}

		if (typeof args.verified_only_clan_roles === 'boolean') {
			await this.client.settings.set(interaction.guild, Settings.VERIFIED_ONLY_CLAN_ROLES, args.verified_only_clan_roles);
		}

		if (typeof args.auto_update_roles === 'boolean') {
			await this.client.settings.set(interaction.guild, Settings.USE_AUTO_ROLE, args.auto_update_roles);
		}

		if (args.maintenance_notification_channel) {
			return interaction.editReply(`This option has been moved to ${this.client.commands.get('/setup utility')}`);
		}

		const validOptions = this.getOptions(interaction.guildId);
		const embed = this.fallback(interaction);
		if (!validOptions.length) return interaction.editReply({ embeds: [embed] });

		const customIds = {
			unset: this.client.uuid(interaction.user.id),
			menu: this.client.uuid(interaction.user.id)
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setLabel('Unset Config').setStyle(ButtonStyle.Success).setCustomId(customIds.unset)
		);
		const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId(customIds.menu).setPlaceholder('Select a config to unset').addOptions(validOptions)
		);

		const message = await interaction.editReply({ embeds: [embed], components: [row] });
		createInteractionCollector({
			message,
			customIds,
			interaction,
			onClick: (action) => {
				return action.update({ embeds: [this.fallback(action)], components: [menu] });
			},
			onSelect: async (action) => {
				const key = action.values[0];
				await this.client.settings.delete(action.guild.id, key);

				const validOptions = this.getOptions(interaction.guildId);
				return action.update({ embeds: [this.fallback(action)], components: validOptions.length ? [row] : [] });
			}
		});
	}

	private getOptions(guildId: string) {
		return options
			.filter((op) => !!this.client.settings.get(guildId, op.key, null))
			.map((op) => ({ label: title(op.name), value: op.key, description: op.description }));
	}

	public fallback(interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>) {
		const color = this.client.settings.get<number>(interaction.guild, Settings.COLOR, null);
		const channel = interaction.guild.channels.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.EVENTS_CHANNEL, null)
		);
		const managerRole = interaction.guild.roles.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.MANAGER_ROLE, null)
		);
		const flagsManagerRole = interaction.guild.roles.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.FLAGS_MANAGER_ROLE, null)
		);
		const rosterManagerRole = interaction.guild.roles.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.ROSTER_MANAGER_ROLE, null)
		);
		const linksManagerRole = interaction.guild.roles.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.LINKS_MANAGER_ROLE, null)
		);
		const clansSortingKey = this.client.settings.get<string>(interaction.guild, Settings.CLANS_SORTING_KEY, 'name');
		const verifiedOnlyClanRoles = this.client.settings.get<string>(interaction.guild, Settings.VERIFIED_ONLY_CLAN_ROLES, false);
		const useAutoRole = this.client.settings.get<string>(interaction.guild, Settings.USE_AUTO_ROLE, true);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: this.i18n('command.config.title', { lng: interaction.locale }) })
			.addFields([
				{
					name: 'Prefix',
					value: '/'
				},
				{
					name: 'Patron',
					value: this.client.patrons.get(interaction.guild.id) ? 'Yes' : 'No'
				},
				{
					name: 'Manager Role',
					value: `${managerRole?.toString() ?? 'None'}`
				},
				{
					name: 'Roster Manager Role',
					value: `${rosterManagerRole?.toString() ?? 'None'}`
				},
				{
					name: 'Flags Manager Role',
					value: `${flagsManagerRole?.toString() ?? 'None'}`
				},
				{
					name: 'Links Manager Role',
					value: `${linksManagerRole?.toString() ?? 'None'}`
				},
				{
					name: 'Webhook Limit',
					value: `${this.client.settings.get<string>(interaction.guild, Settings.WEBHOOK_LIMIT, 8)}`
				},
				{
					name: 'Clans Sorting',
					value: `By ${clansSortingKey}`
				},
				{
					name: 'Verified-Only Clan Roles',
					value: `${verifiedOnlyClanRoles ? 'Yes' : 'No'}`
				},
				{
					name: 'Auto Update Roles',
					value: `${useAutoRole ? 'Yes' : 'No'}`
				},
				{
					name: this.i18n('common.color_code', { lng: interaction.locale }),
					value: color ? `#${color.toString(16).toUpperCase()}` : 'None'
				},
				{
					name: this.i18n('command.config.maintenance_notification_channel', { lng: interaction.locale }),
					value: channel?.toString() ?? 'None'
				}
			]);

		if (process.env.RAILWAY_SERVICE_ID) {
			embed.setFooter({ text: `Service ID: ${process.env.RAILWAY_SERVICE_ID!}` });
		}

		return embed;
	}

	private getColor(hex: string) {
		try {
			return resolveColor(hex as HexColorString);
		} catch {
			return null;
		}
	}
}
