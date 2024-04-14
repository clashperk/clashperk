import { CommandInteraction } from 'discord.js';
import { title } from 'radash';
import { Command } from '../../lib/index.js';
import { Collections, Settings } from '../../util/Constants.js';

export default class AutoRoleDisableCommand extends Command {
	public constructor() {
		super('autorole-disable', {
			category: 'setup',
			channel: 'guild',
			defer: true,
			userPermissions: ['ManageGuild']
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { type: string; clans?: string; clear?: boolean }) {
		const action = {
			'town-hall': this.disableTownHallRoles.bind(this),
			'builder-hall': this.disableBuilderHallRoles.bind(this),
			'clan-roles': this.disableClanRoles.bind(this),
			'leagues': this.disableLeagueRoles.bind(this),
			'builder-leagues': this.disableBuilderLeagueRoles.bind(this),
			'wars': this.disableWarRoles.bind(this),
			'family': this.disableFamilyRoles.bind(this),
			'family-leaders': this.disableFamilyRoles.bind(this),
			'guest': this.disableFamilyRoles.bind(this),
			'verified': this.disableFamilyRoles.bind(this)
		}[args.type];

		if (typeof action !== 'function') throw new Error('Invalid action was specified');

		return action(interaction, args);
	}

	private async disableClanRoles(interaction: CommandInteraction<'cached'>, args: { clear?: boolean; clans?: string }) {
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

	private async disableFamilyRoles(interaction: CommandInteraction<'cached'>, args: { type: string }) {
		if (args.type === 'family') {
			this.client.settings.delete(interaction.guildId, Settings.FAMILY_ROLE);
		}
		if (args.type === 'exclusive-family') {
			this.client.settings.delete(interaction.guildId, Settings.FAMILY_ROLE);
		}
		if (args.type === 'guest') {
			this.client.settings.delete(interaction.guildId, Settings.GUEST_ROLE);
		}
		if (args.type === 'family-leaders') {
			this.client.settings.delete(interaction.guildId, Settings.FAMILY_LEADERS_ROLE);
		}
		if (args.type === 'verified') {
			this.client.settings.delete(interaction.guildId, Settings.ACCOUNT_VERIFIED_ROLE);
		}
		return interaction.editReply(`Successfully disabled ${title(args.type)} role.`);
	}

	private async disableLeagueRoles(interaction: CommandInteraction<'cached'>) {
		this.client.settings.delete(interaction.guildId, Settings.LEAGUE_ROLES);
		this.client.settings.delete(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE);
		return interaction.editReply('Successfully disabled league roles.');
	}

	private async disableBuilderLeagueRoles(interaction: CommandInteraction<'cached'>) {
		this.client.settings.delete(interaction.guildId, Settings.BUILDER_LEAGUE_ROLES);
		return interaction.editReply('Successfully disabled builder league roles.');
	}

	private async disableTownHallRoles(interaction: CommandInteraction<'cached'>) {
		this.client.settings.delete(interaction.guildId, Settings.TOWN_HALL_ROLES);
		this.client.settings.delete(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS);
		return interaction.editReply('Successfully disabled Town Hall roles.');
	}

	private async disableBuilderHallRoles(interaction: CommandInteraction<'cached'>) {
		this.client.settings.delete(interaction.guildId, Settings.BUILDER_HALL_ROLES);
		return interaction.editReply('Successfully disabled Builder Hall roles.');
	}

	private async disableWarRoles(interaction: CommandInteraction<'cached'>, args: { clans?: string; clear?: boolean }) {
		if (args.clear) {
			const { matchedCount } = await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany({ guild: interaction.guild.id }, { $unset: { warRole: '' } });
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
			.updateMany({ guild: interaction.guild.id, tag: { $in: clans.map((clan) => clan.tag) } }, { $unset: { warRole: '' } });

		return interaction.editReply(
			this.i18n('command.autorole.disable.success_with_count', {
				lng: interaction.locale,
				count: clans.length.toString(),
				clans: clans.map((clan) => clan.name).join(', ')
			})
		);
	}
}
