import { CommandInteraction, Guild, Role } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Args, Command } from '../../lib';

export interface IArgs {
	command?: 'enable' | 'disable' | null;
	clans?: string;
	members?: Role;
	elders?: Role;
	coLeads?: Role;
	commonRole?: Role;
	verify: boolean;
	clear?: boolean;
}

export default class AutoRoleCommand extends Command {
	public constructor() {
		super('setup-auto-role', {
			name: 'autorole',
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Auto-assign roles to members based upon their role in the clan.']
			},
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS', 'MANAGE_ROLES'],
			defer: true,
			ephemeral: true
		});
	}

	public args(): Args {
		return {
			'co-leads': {
				id: 'coLeads',
				match: 'ROLE'
			},
			'common-role': {
				id: 'commonRole',
				match: 'ROLE'
			},
			'only-verified': {
				id: 'verify',
				match: 'BOOLEAN'
			},
			'clear': {
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: IArgs) {
		if (args.command === 'disable') return this.disable(interaction, args);

		const tags = args.clans === '*' ? [] : args.clans?.split(/ +/g) ?? [];
		const clans =
			args.clans === '*'
				? await this.client.storage.find(interaction.guildId)
				: await this.client.storage.search(interaction.guildId, tags);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const { members, elders, coLeads, commonRole } = args;

		if (!(members && elders && coLeads)) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_roles', { lng: interaction.locale }));
		}

		if ([members, elders, coLeads].some((role) => this.isSystemRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_system_roles', { lng: interaction.locale }));
		}

		if ([members, elders, coLeads].some((role) => this.isHigherRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_higher_roles', { lng: interaction.locale }));
		}

		if (commonRole) {
			if (this.isSystemRole(commonRole, interaction.guild)) {
				return interaction.editReply(this.i18n('command.autorole.enable.no_system_roles', { lng: interaction.locale }));
			}
			if (this.isHigherRole(commonRole, interaction.guild)) {
				return interaction.editReply(this.i18n('command.autorole.enable.no_higher_roles', { lng: interaction.locale }));
			}
		}

		const duplicate = await this.client.db
			.collection(Collections.CLAN_STORES)
			.findOne({ tag: { $nin: clans.map((clan) => clan.tag) }, roleIds: { $in: [members.id, elders.id, coLeads.id] } });

		if (duplicate && !this.client.patrons.get(interaction.guild.id)) {
			return interaction.editReply(this.i18n('command.autorole.enable.roles_already_used', { lng: interaction.locale }));
		}

		await this.client.db.collection(Collections.CLAN_STORES).updateMany(
			{ tag: { $in: clans.map((clan) => clan.tag) }, guild: interaction.guild.id },
			{
				$set: {
					roles: { member: members.id, admin: elders.id, coLeader: coLeads.id, everyone: commonRole?.id ?? null },
					roleIds: [members.id, elders.id, coLeads.id],
					secureRole: args.verify
				}
			}
		);

		this.updateLinksAndRoles(clans);
		return interaction.editReply(
			this.i18n('command.autorole.enable.success_with_count', {
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
		return role.position > guild.me!.roles.highest.position;
	}

	private async updateLinksAndRoles(clans: { tag: string }[]) {
		for (const clan of clans) {
			const data = await this.client.http.clan(clan.tag);
			if (!data.ok) continue;

			const links = await this.client.db
				.collection(Collections.LINKED_PLAYERS)
				.aggregate([
					{
						$match: {
							'entries.tag': data.memberList.map((mem) => mem.tag)
						}
					},
					{
						$unwind: {
							path: '$entries'
						}
					},
					{
						$project: {
							tag: '$entries.tag',
							user: '$user'
						}
					}
				])
				.toArray();

			const unknowns = await this.client.http.getDiscordLinks(data.memberList);
			for (const { user, tag } of unknowns) {
				if (links.find((mem) => mem.tag === tag && mem.user === user)) continue;

				const players = data.memberList.find((mem) => mem.tag === tag) ?? (await this.client.http.player(tag));
				if (!players.name) continue;
				try {
					await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
						{ user, 'entries.tag': { $ne: tag } },
						{
							$push: {
								entries: { tag, name: players.name, verified: false, unknown: true }
							},
							$setOnInsert: {
								clan: {
									tag: data.tag,
									name: data.name
								},
								createdAt: new Date()
							},
							$set: {
								user_tag: this.client.users.cache.get(user)?.tag
							}
						},
						{ upsert: true }
					);
				} catch {}
			}

			await this.client.rpcHandler.roleManager.queue(data);
		}
	}

	private async disable(interaction: CommandInteraction<'cached'>, args: IArgs) {
		if (args.clear) {
			const { matchedCount } = await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany({ guild: interaction.guild.id }, { $unset: { roles: '', roleIds: '', secureRole: '' } });
			return interaction.editReply(
				this.i18n('command.autorole.disable.success_with_count', {
					lng: interaction.locale,
					count: matchedCount.toString(),
					clans: ''
				})
			);
		}

		const tags = args.clans?.split(/ +/g) ?? [];
		const clans = tags.length ? await this.client.storage.search(interaction.guildId, tags) : [];

		if (!tags.length) {
			return interaction.editReply(this.i18n('common.no_clan_tag', { lng: interaction.locale }));
		}
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		}

		await this.client.db
			.collection(Collections.CLAN_STORES)
			.updateMany(
				{ guild: interaction.guild.id, tag: { $in: clans.map((clan) => clan.tag) } },
				{ $unset: { roles: '', roleIds: '', secureRole: '' } }
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
