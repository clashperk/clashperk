import { CommandInteraction, Guild, Role } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { PLAYER_LEAGUE_NAMES, Settings } from '../../util/Constants.js';

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

export default class AutoLeagueRoleCommand extends Command {
	public constructor() {
		super('setup-league-roles', {
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
			allow_non_family_accounts: {
				id: 'allowExternal',
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			command: string;
			allowExternal: boolean;
		} & Record<string, Role | null>
	) {
		if (args.command === 'disable') return this.disable(interaction);
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const roles = PLAYER_LEAGUE_NAMES.map((league) => ({
			role: args[league],
			league: league
		}));

		const selected = roles.filter((r) => r.role);
		if (!selected.length) {
			return interaction.followUp({ content: 'You must select at least one role.', ephemeral: true });
		}

		if (selected.some((r) => this.isSystemRole(r.role!, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_system_roles', { lng: interaction.locale }));
		}

		if (selected.some((r) => this.isHigherRole(r.role!, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
		}

		await this.client.settings.set(
			interaction.guildId,
			Settings.LEAGUE_ROLES,
			selected.reduce<Record<string, string>>((prev, curr) => {
				prev[curr.league] = curr.role!.id;
				return prev;
			}, {})
		);
		await this.client.settings.set(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE, Boolean(args.allowExternal));

		this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles

		return interaction.editReply({
			allowedMentions: { parse: [] },
			content: [
				roles
					.map(
						(role) =>
							`${role.league.replace(/\b(\w)/g, (char) => char.toUpperCase())} ${role.role ? `<@&${role.role.id}>` : ''}`
					)
					.join('\n'),
				'',
				args.allowExternal ? '' : '(Family Only) Roles will be given to family members only.'
			].join('\n')
		});
	}

	private isSystemRole(role: Role, guild: Guild) {
		return role.managed || role.id === guild.id;
	}

	private isHigherRole(role: Role, guild: Guild) {
		return role.position > guild.members.me!.roles.highest.position;
	}

	private async disable(interaction: CommandInteraction<'cached'>) {
		this.client.settings.delete(interaction.guildId, Settings.LEAGUE_ROLES);
		this.client.settings.delete(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE);
		return interaction.editReply('Successfully disabled automatic league roles.');
	}
}
