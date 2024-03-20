import { CommandInteraction, Guild, Role } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections, Settings } from '../../util/Constants.js';

export default class AutoClanRoleCommand extends Command {
	public constructor() {
		super('setup-clan-roles', {
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
			clans?: string;
			member_role?: Role;
			elder_role?: Role;
			co_leader_role?: Role;
			leader_role?: Role;
			everyone_role?: Role;
			only_verified: boolean;

			command?: 'refresh' | 'disable' | null;
			clear?: boolean;
		}
	) {
		if (args.command === 'disable') return this.disable(interaction, args);

		const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans, required: true });
		if (!clans) return;

		const { everyone_role, member_role, elder_role, co_leader_role, leader_role } = args;
		const roles = [everyone_role, member_role, elder_role, co_leader_role, leader_role];
		const selected = roles.filter((role) => role) as Role[];

		if (typeof args.only_verified === 'boolean') {
			await this.client.settings.set(interaction.guildId, Settings.VERIFIED_ONLY_CLAN_ROLES, Boolean(args.only_verified));
			if (!selected.length) {
				return interaction.editReply('Clan roles settings updated.');
			}
		}

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

		const rolesSettings: Record<string, string> = {};

		if (member_role) rolesSettings['roles.member'] = member_role.id;
		if (elder_role) rolesSettings['roles.admin'] = elder_role.id;
		if (co_leader_role) rolesSettings['roles.coLeader'] = co_leader_role.id;
		if (leader_role) rolesSettings['roles.leader'] = leader_role.id;
		if (everyone_role) rolesSettings['roles.everyone'] = everyone_role.id;

		if (Object.keys(rolesSettings).length) {
			await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany({ tag: { $in: clans.map((clan) => clan.tag) }, guild: interaction.guild.id }, { $set: { ...rolesSettings } });
		}

		this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles

		return interaction.editReply(
			this.i18n('command.autorole.success_with_count', {
				lng: interaction.locale,
				count: clans.length.toString(),
				clans: `${clans.map((clan) => clan.name).join(', ')}`
			})
		);
	}

	private isSystemRole(role: Role, guild: Guild) {
		return role.managed || role.id === guild.id;
	}

	private isHigherRole(role: Role, guild: Guild) {
		return guild.members.me && role.position > guild.members.me.roles.highest.position;
	}

	private async disable(interaction: CommandInteraction<'cached'>, args: { clear?: boolean; clans?: string }) {
		if (args.clear) {
			const { matchedCount } = await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany({ guild: interaction.guild.id }, { $unset: { roles: '', secureRole: '' } });
			return interaction.editReply(
				this.i18n('command.autorole.disable.success_with_count', {
					lng: interaction.locale,
					count: matchedCount.toString(),
					clans: ''
				})
			);
		}

		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length ? await this.client.storage.search(interaction.guildId, tags) : [];

		if (!tags.length) {
			return interaction.editReply(
				this.i18n('common.no_clan_tag', { lng: interaction.locale, command: this.client.commands.LINK_CREATE })
			);
		}
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		await this.client.db
			.collection(Collections.CLAN_STORES)
			.updateMany(
				{ guild: interaction.guild.id, tag: { $in: clans.map((clan) => clan.tag) } },
				{ $unset: { roles: '', secureRole: '' } }
			);

		return interaction.editReply(
			this.i18n('command.autorole.disable.success_with_count', {
				lng: interaction.locale,
				count: clans.length.toString(),
				clans: clans.map((clan) => clan.name).join(', ')
			})
		);
	}
}
