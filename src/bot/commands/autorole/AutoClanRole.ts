import { CommandInteraction, Guild, Role } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Collections, Settings } from '../../util/Constants.js';

export interface IArgs {
	command?: 'refresh' | 'disable' | null;
	clans?: string;
	member?: Role;
	elder?: Role;
	coLead?: Role;
	leader?: Role;
	commonRole?: Role;
	verify: boolean;
	clear?: boolean;
}

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

	public args(): Args {
		return {
			co_lead: {
				id: 'coLead',
				match: 'ROLE'
			},
			common_role: {
				id: 'commonRole',
				match: 'ROLE'
			},
			only_verified: {
				id: 'verify',
				match: 'BOOLEAN'
			},
			clear: {
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: IArgs) {
		if (args.command === 'disable') return this.disable(interaction, args);

		const tags = args.clans === '*' ? [] : await this.client.resolver.resolveArgs(args.clans);
		const clans =
			args.clans === '*'
				? await this.client.storage.find(interaction.guildId)
				: await this.client.storage.search(interaction.guildId, tags);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const { member, elder, coLead, leader, commonRole } = args;
		const roles = [member, elder, coLead, leader, commonRole];
		const selected = roles.filter((role) => role) as Role[];

		if (typeof args.verify === 'boolean') {
			await this.client.settings.set(interaction.guildId, Settings.VERIFIED_ONLY_CLAN_ROLES, Boolean(args.verify));
			if (!selected.length) {
				return interaction.editReply('Clan roles settings updated.');
			}
		}

		if (!selected.length) {
			return interaction.followUp({ content: 'You must select at least one role.', ephemeral: true });
		}

		if (selected.some((role) => this.isSystemRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_system_roles', { lng: interaction.locale }));
		}

		if (selected.some((role) => this.isHigherRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
		}

		const rolesSettings: Record<string, string> = {};

		if (member) rolesSettings['roles.member'] = member.id;
		if (elder) rolesSettings['roles.admin'] = elder.id;
		if (coLead) rolesSettings['roles.coLeader'] = coLead.id;
		if (leader) rolesSettings['roles.leader'] = leader.id;
		if (commonRole) rolesSettings['roles.everyone'] = commonRole.id;

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

	private async disable(interaction: CommandInteraction<'cached'>, args: IArgs) {
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
