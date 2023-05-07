import { CommandInteraction, Guild, Role } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Args, Command } from '../../lib/index.js';
import { PlayerLinks } from '../../types/index.js';

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

		if (!(member && elder && coLead && leader)) {
			return interaction.editReply(this.i18n('command.autorole.no_roles', { lng: interaction.locale }));
		}

		if ([member, elder, coLead, leader].some((role) => this.isSystemRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_system_roles', { lng: interaction.locale }));
		}

		if ([member, elder, coLead, leader].some((role) => this.isHigherRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
		}

		if (commonRole) {
			if (this.isSystemRole(commonRole, interaction.guild)) {
				return interaction.editReply(this.i18n('command.autorole.no_system_roles', { lng: interaction.locale }));
			}
			if (this.isHigherRole(commonRole, interaction.guild)) {
				return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
			}
		}

		await this.client.db.collection(Collections.CLAN_STORES).updateMany(
			{ tag: { $in: clans.map((clan) => clan.tag) }, guild: interaction.guild.id },
			{
				$set: {
					roles: {
						member: member.id,
						admin: elder.id,
						coLeader: coLead.id,
						leader: leader.id,
						everyone: commonRole?.id ?? null
					},
					secureRole: args.verify
				}
			}
		);

		this.updateLinksAndRoles(clans);
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
		return role.position > guild.members.me!.roles.highest.position;
	}

	private async updateLinksAndRoles(clans: { tag: string }[]) {
		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		for (const clan of clans) {
			const data = await this.client.http.clan(clan.tag);
			if (!data.ok) continue;

			const links = await collection.find({ tag: { $in: data.memberList.map((mem) => mem.tag) } }).toArray();
			const unknowns = await this.client.http.getDiscordLinks(data.memberList);

			for (const { userId, tag } of unknowns) {
				if (links.find((mem) => mem.tag === tag && mem.userId === userId)) continue;
				const lastAccount = await collection.findOne({ userId }, { sort: { order: -1 } });

				const player = data.memberList.find((mem) => mem.tag === tag) ?? (await this.client.http.player(tag));
				if (!player.name) continue;

				const user = await this.client.users.fetch(userId).catch(() => null);
				if (!user) continue;

				try {
					await collection.insertOne({
						userId: user.id,
						username: user.username,
						tag,
						name: player.name,
						verified: false,
						order: lastAccount?.order ? lastAccount.order + 1 : 0,
						createdAt: new Date()
					});
				} catch {}
			}

			await this.client.rpcHandler.roleManager.queue(data, {});
		}
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
