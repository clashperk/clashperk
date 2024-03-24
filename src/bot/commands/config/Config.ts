import { CommandInteraction, EmbedBuilder, HexColorString, PermissionFlagsBits, Role, resolveColor } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			category: 'config',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks'],
			channel: 'guild',
			defer: false
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			color_code?: string;
			events_channel?: string;
			webhook_limit?: number;
			manager_role?: Role;
			roster_manager_role?: Role;
			account_linked_role?: Role;
			account_verified_role?: Role;
			clans_sorting_key?: string;
			auto_update_roles?: boolean;
			verified_only_clan_roles?: boolean;
		}
	) {
		if (args.color_code) {
			if (['reset', 'none'].includes(args.color_code)) {
				await this.client.settings.delete(interaction.guild, Settings.COLOR);
			}
			await this.client.settings.set(interaction.guild, Settings.COLOR, this.getColor(args.color_code));
		}

		if (args.webhook_limit) {
			const webhookLimit = Math.max(3, Math.min(8, args.webhook_limit));
			await this.client.settings.set(interaction.guild, Settings.WEBHOOK_LIMIT, webhookLimit);
		}

		if (args.manager_role || args.roster_manager_role) {
			if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
				return interaction.reply({
					content: 'You are missing the **Manage Server** permission to change this setting.',
					ephemeral: true
				});
			}
		}

		if (args.manager_role) {
			await this.client.settings.set(interaction.guild, Settings.MANAGER_ROLE, args.manager_role.id);
		}

		if (args.roster_manager_role) {
			await this.client.settings.set(interaction.guild, Settings.ROSTER_MANAGER_ROLE, args.roster_manager_role.id);
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

		if (args.events_channel) {
			if (['reset', 'none'].includes(args.events_channel)) {
				await this.client.settings.delete(interaction.guild, Settings.EVENTS_CHANNEL);
			} else if (/\d{17,19}/g.test(args.events_channel)) {
				const channel = this.client.util.hasPermissions(args.events_channel.match(/\d{17,19}/g)!.at(0)!, [
					'ManageWebhooks',
					'ViewChannel'
				]);
				if (!channel) {
					return interaction.reply({
						content: this.i18n('command.config.no_text_channel', { lng: interaction.locale }),
						ephemeral: true
					});
				}
				await this.client.settings.set(interaction.guild, Settings.EVENTS_CHANNEL, channel.channel.id);
			}
		}

		return this.fallback(interaction);
	}

	public fallback(interaction: CommandInteraction<'cached'>) {
		const color = this.client.settings.get<number>(interaction.guild, Settings.COLOR, null);
		const channel = interaction.guild.channels.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.EVENTS_CHANNEL, null)
		);
		const managerRole = interaction.guild.roles.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.MANAGER_ROLE, null)
		);
		const rosterManagerRole = interaction.guild.roles.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.ROSTER_MANAGER_ROLE, null)
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
					name: this.i18n('command.config.events_channel', { lng: interaction.locale }),
					value: channel?.toString() ?? 'None'
				}
			]);

		if (process.env.RAILWAY_SERVICE_ID) {
			embed.setFooter({ text: `Service ID: ${process.env.RAILWAY_SERVICE_ID!}` });
		}

		return interaction.reply({ embeds: [embed], ephemeral: this.muted });
	}

	private getColor(hex: string) {
		try {
			return resolveColor(hex as HexColorString);
		} catch {
			return null;
		}
	}
}
