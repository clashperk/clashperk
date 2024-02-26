import { CommandInteraction, Guild, Role } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { MAX_TOWN_HALL_LEVEL, Settings } from '../../util/Constants.js';
import { ORANGE_NUMBERS } from '../../util/Emojis.js';

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

export default class AutoTownHallRoleCommand extends Command {
	public constructor() {
		super('setup-town-hall-roles', {
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
		args: { [key: `th_${string}`]: Role | null; command: string; allowExternal: boolean }
	) {
		if (args.command === 'disable') return this.disable(interaction);

		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const roles = Array(MAX_TOWN_HALL_LEVEL - 2)
			.fill(0)
			.map((_, i) => ({ role: args[`th_${i + 3}`], hall: i + 3 }));

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
			Settings.TOWN_HALL_ROLES,
			selected.reduce<Record<string, string>>((prev, curr) => {
				prev[curr.hall] = curr.role!.id;
				return prev;
			}, {})
		);
		await this.client.settings.set(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS, Boolean(args.allowExternal));

		this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles

		return interaction.editReply({
			allowedMentions: { parse: [] },
			content: [
				roles.map((role) => `${ORANGE_NUMBERS[role.hall]} ${role.role ? `<@&${role.role.id}>` : ''}`).join('\n'),
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
		this.client.settings.delete(interaction.guildId, Settings.TOWN_HALL_ROLES);
		this.client.settings.delete(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS);
		return interaction.editReply('Successfully disabled automatic Town Hall roles.');
	}
}
