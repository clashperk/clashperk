import { CommandInteraction, Guild, Role } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

export default class AutoClanRoleCommand extends Command {
	public constructor() {
		super('setup-war-roles', {
			aliases: ['autorole-wars'],
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { role: Role; clan_tag: string; command: string; clans?: string }) {
		if (args.command === 'disable') return this.disable(interaction, args);

		const clan = await this.client.db
			.collection(Collections.CLAN_STORES)
			.findOne({ guild: interaction.guild.id, tag: this.client.http.fixTag(args.clan_tag) });
		if (!clan) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		if ([args.role].some((role) => this.isSystemRole(role, interaction.guild))) {
			return interaction.editReply(`${this.i18n('command.autorole.no_system_roles', { lng: interaction.locale })} (${args.role.id})`);
		}

		if ([args.role].some((role) => this.isHigherRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
		}

		const roleInUse = await this.client.db
			.collection(Collections.CLAN_STORES)
			.findOne({ tag: { $ne: clan.tag }, guild: interaction.guild.id, warRole: args.role.id });

		if (roleInUse) {
			return interaction.editReply('This role is already in use by another clan.');
		}

		await this.client.db.collection(Collections.CLAN_STORES).updateMany(
			{ tag: clan.tag, guild: interaction.guild.id },
			{
				$set: {
					warRole: args.role.id
				}
			}
		);

		this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles

		return interaction.editReply('Clan war role successfully enabled.');
	}

	private isSystemRole(role: Role, guild: Guild) {
		return role.managed || role.id === guild.id;
	}

	private isHigherRole(role: Role, guild: Guild) {
		return role.position > guild.members.me!.roles.highest.position;
	}

	private async disable(interaction: CommandInteraction<'cached'>, args: { clans?: string; clear?: boolean }) {
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
