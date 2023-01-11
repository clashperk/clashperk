import { ActionRowBuilder, CommandInteraction, ComponentType, Guild, Role, RoleSelectMenuBuilder } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { ORANGE_NUMBERS } from '../../util/Emojis.js';

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
		super('th-roles', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: IArgs) {
		if (args.command === 'disable') return this.disable(interaction, args);

		const customIds = {
			roles: this.client.uuid(interaction.user.id)
		};

		const row = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
			new RoleSelectMenuBuilder().setCustomId(customIds.roles).setMinValues(1).setMaxValues(14)
		);
		const msg = await interaction.editReply({ components: [row], content: '^__^' });
		const collector = msg.createMessageComponentCollector<ComponentType.RoleSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.roles) {
				const rolesMap = action.roles.reduce<Record<string, string>>((prev, role) => {
					const key = parseInt(role.name.replace(/[^0-9]/g, ''), 10);
					if (key >= 2 && key <= 15) {
						prev[key] = role.id;
					}
					return prev;
				}, {});
				const roles = Array(14)
					.fill(0)
					.map((_, i) => ({ roleId: rolesMap[i + 2], th: i + 2 }));

				// sort by key
				await action.update({
					allowedMentions: { parse: [] },
					content: roles.map((role) => `${ORANGE_NUMBERS[role.th]} ${role.roleId ? `<@&${role.roleId}>` : ''}`).join('\n')
				});
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	public async __exec(interaction: CommandInteraction<'cached'>, args: IArgs) {
		if (args.command === 'disable') return this.disable(interaction, args);

		const tags = args.clans === '*' ? [] : await this.client.resolver.resolveArgs(args.clans);
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
		return role.position > guild.members.me!.roles.highest.position;
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

		const tags = await this.client.resolver.resolveArgs(args.clans);
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
