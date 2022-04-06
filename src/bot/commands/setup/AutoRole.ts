import { Collections } from '../../util/Constants';
import { CommandInteraction, Role, Snowflake } from 'discord.js';
import { Args, Command } from '../../lib';

export interface IArgs {
	command?: 'enable' | 'disable' | null;
	tag?: string;
	members?: Role;
	elders?: Role;
	coLeads?: Role;
	verify: boolean;
}

export default class AutoRoleCommand extends Command {
	public constructor() {
		super('setup-auto-role', {
			name: 'autorole',
			category: 'setup',
			channel: 'guild',
			description: {
				content: [
					'Auto-assign roles to members based upon their role in the clan.',
					'',
					'- Players must be linked to our system to receive roles.',
					'- You can either use the same roles for all clans or individual roles for each clan, but not both.'
				]
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
			'verify': {
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(interaction: CommandInteraction, { tag, members, elders, coLeads, verify, command }: IArgs) {
		if (command === 'disable') {
			return this.handler.exec(interaction, this.handler.modules.get('setup-disable')!, { option: 'auto-role', tag });
		}

		if (!(members && elders && coLeads)) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_roles', { lng: interaction.locale }));
		}

		if ([members, elders, coLeads].filter((role) => role.managed || role.id === interaction.guild!.id).length) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_system_roles', { lng: interaction.locale }));
		}

		if ([members, elders, coLeads].filter((role) => role.position > interaction.guild!.me!.roles.highest.position).length) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_higher_roles', { lng: interaction.locale }));
		}

		if (tag) {
			const clan = await this.client.http.clan(tag);
			if (!clan.ok) return interaction.editReply(this.i18n('command.autorole.enable.invalid_clan_tag', { lng: interaction.locale }));

			await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany({ guild: interaction.guild!.id, autoRole: 2 }, { $unset: { role_ids: '', roles: '', autoRole: '' } });

			const ex = await this.client.db
				.collection(Collections.CLAN_STORES)
				.findOne({ tag: { $ne: clan.tag }, role_ids: { $in: [members.id, elders.id, coLeads.id] } });

			if (ex) return interaction.editReply(this.i18n('command.autorole.enable.roles_already_used', { lng: interaction.locale }));

			const up = await this.client.db.collection(Collections.CLAN_STORES).updateOne(
				{ tag: clan.tag, guild: interaction.guild!.id },
				{
					$set: {
						roles: { member: members.id, elder: elders.id, coLeader: coLeads.id },
						autoRole: 1,
						secureRole: verify
					},
					$addToSet: { role_ids: { $each: [members.id, elders.id, coLeads.id] } }
				}
			);

			if (!up.matchedCount)
				return interaction.editReply(this.i18n('command.autorole.enable.clan_not_linked', { lng: interaction.locale }));

			this.updateLinksAndRoles([clan]);
			return interaction.editReply(
				this.i18n('command.autorole.enable.success_clan', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		const clans = await this.client.storage.find(interaction.guild!.id);
		if (!clans.length) return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));

		await this.client.db
			.collection(Collections.CLAN_STORES)
			.updateMany({ guild: interaction.guild!.id, autoRole: 1 }, { $unset: { role_ids: '', roles: '', autoRole: '' } });

		await this.client.db.collection<{ role_ids: Snowflake[] }>(Collections.CLAN_STORES).updateMany(
			{ guild: interaction.guild!.id },
			{
				$set: {
					roles: { member: members.id, admin: elders.id, coLeader: coLeads.id },
					autoRole: 2,
					secureRole: verify
				},
				$addToSet: { role_ids: { $each: [members.id, elders.id, coLeads.id] } }
			}
		);

		this.updateLinksAndRoles(clans);
		return interaction.editReply(
			this.i18n('command.autorole.enable.success', { lng: interaction.locale, count: clans.length.toString() })
		);
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
}
