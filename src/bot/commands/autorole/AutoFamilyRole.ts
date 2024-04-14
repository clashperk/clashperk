import { ActionRowBuilder, CommandInteraction, EmbedBuilder, Guild, Role, RoleSelectMenuBuilder } from 'discord.js';
import { unique } from 'radash';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';
import { createInteractionCollector } from '../../util/Pagination.js';

export interface IArgs {
	command?: 'refresh' | 'disable' | null;
	clans?: string;
	members?: Role;
	elders?: Role;
	coLeads?: Role;
	commonRole?: Role;
	verify: boolean;
	clear?: boolean;
}

export default class AutoFamilyRoleCommand extends Command {
	public constructor() {
		super('setup-family-roles', {
			aliases: ['autorole-family'],
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			family_leaders_role?: Role;
			family_role?: Role;
			exclusive_family_role?: Role;
			guest_role?: Role;
			verified_role?: Role;
		}
	) {
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const roles = [args.verified_role, args.guest_role, args.family_role, args.family_leaders_role, args.exclusive_family_role];

		const selected = roles.filter((role) => role) as Role[];
		if (!selected.length) {
			return interaction.followUp({ content: 'You must select at least one role.', ephemeral: true });
		}

		if (selected.some((role) => this.isSystemRole(role, interaction.guild))) {
			const systemRoles = selected.filter((role) => this.isSystemRole(role, interaction.guild));
			return interaction.editReply(
				`${this.i18n('command.autorole.no_system_roles', { lng: interaction.locale })} (${systemRoles
					.map(({ id }) => `<@&${id}>`)
					.join(', ')})`
			);
		}

		if (selected.some((role) => this.isHigherRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
		}

		if (args.family_role) {
			await this.client.settings.set(interaction.guild, Settings.FAMILY_ROLE, args.family_role.id);
		}

		if (args.exclusive_family_role) {
			await this.client.settings.set(interaction.guild, Settings.EXCLUSIVE_FAMILY_ROLE, args.exclusive_family_role.id);
		}

		if (args.family_leaders_role) {
			const _familyLeadersRoles = this.client.settings.get<string | string[]>(interaction.guild, Settings.FAMILY_LEADERS_ROLE, []);
			const familyLeadersRoles = Array.isArray(_familyLeadersRoles) ? _familyLeadersRoles : [_familyLeadersRoles];

			await this.client.settings.set(
				interaction.guild,
				Settings.FAMILY_LEADERS_ROLE,
				unique([...familyLeadersRoles, args.family_leaders_role.id]).filter((id) => interaction.guild.roles.cache.has(id))
			);
		}

		if (args.guest_role) {
			await this.client.settings.set(interaction.guild, Settings.GUEST_ROLE, args.guest_role.id);
		}

		if (args.verified_role) {
			await this.client.settings.set(interaction.guild, Settings.ACCOUNT_VERIFIED_ROLE, args.verified_role.id);
		}

		this.client.storage.updateClanLinks(interaction.guildId);
		// TODO: Refresh Roles

		const mutate = async () => {
			const rolesMap = await this.client.rolesManager.getGuildRolesMap(interaction.guildId);

			const embed = new EmbedBuilder();
			embed.setTitle('Family Role Settings').setURL('https://docs.clashperk.com/features/auto-role');
			embed.addFields({
				name: 'Family Leaders Roles',
				value: rolesMap.familyLeadersRoles.map((id) => this.getRoleOrNone(id)).join(', ') || 'None'
			});
			embed.addFields({ name: 'Family Role', value: this.getRoleOrNone(rolesMap.familyRoleId) });
			embed.addFields({ name: 'Exclusive Family Role', value: this.getRoleOrNone(rolesMap.exclusiveFamilyRoleId) });
			embed.addFields({ name: 'Guest Role', value: this.getRoleOrNone(rolesMap.guestRoleId) });
			embed.addFields({ name: 'Verified Role', value: this.getRoleOrNone(rolesMap.verifiedRoleId) });

			return embed;
		};

		const embed = await mutate();
		if (!args.family_leaders_role) return interaction.editReply({ embeds: [embed] });

		const customIds = { roles: this.client.uuid() };
		const menu = new RoleSelectMenuBuilder()
			.setPlaceholder('Select Family Leaders Roles')
			.setCustomId(customIds.roles)
			.setMaxValues(25);

		const familyLeadersRoles = this.client.settings
			.get<string[]>(interaction.guild, Settings.FAMILY_LEADERS_ROLE, [])
			.filter((id) => interaction.guild.roles.cache.has(id));
		if (familyLeadersRoles.length) menu.setDefaultRoles(...familyLeadersRoles);

		const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(menu);

		const message = await interaction.editReply({ embeds: [embed], components: [row] });

		createInteractionCollector({
			interaction,
			message,
			customIds,
			onRoleSelect: async (action) => {
				if (action.roles.some((role) => this.isSystemRole(role, action.guild))) {
					const systemRoles = action.roles
						.filter((role) => this.isSystemRole(role, action.guild))
						.map(({ id }) => `<@&${id}>`)
						.join(', ');

					return action.reply({
						content: `${this.i18n('command.autorole.no_system_roles', { lng: action.locale })} (${systemRoles})`,
						ephemeral: true
					});
				}

				if (action.roles.some((role) => this.isHigherRole(role, action.guild))) {
					return action.reply({
						content: this.i18n('command.autorole.no_higher_roles', { lng: action.locale }),
						ephemeral: true
					});
				}

				await this.client.settings.set(
					action.guild,
					Settings.FAMILY_LEADERS_ROLE,
					action.roles.map((role) => role.id)
				);

				const embed = await mutate();
				return action.update({ embeds: [embed], components: [] });
			}
		});
	}

	private isSystemRole(role: Role, guild: Guild) {
		return role.managed || role.id === guild.id;
	}

	private isHigherRole(role: Role, guild: Guild) {
		return role.position > guild.members.me!.roles.highest.position;
	}

	private getRoleOrNone(id?: string | null) {
		return id ? `<@&${id}>` : 'None';
	}
}
