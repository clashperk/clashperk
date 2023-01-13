import { CommandInteraction, Guild, Role } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections, Settings } from '../../util/Constants.js';
import { ORANGE_NUMBERS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

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
		super('setup-town-hall-roles', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { [key: `th_${string}`]: Role | null; command: string }) {
		if (args.command === 'disable') return this.disable(interaction);
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}
		const roles = Array(13)
			.fill(0)
			.map((_, i) => ({ role: args[`th_${i + 3}`], hall: i + 3 }));

		const selected = roles.filter((r) => r.role);
		if (!selected.length) {
			return interaction.followUp({ content: 'You must select at least one role.', ephemeral: true });
		}

		if (selected.some((r) => this.isSystemRole(r.role!, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_system_roles', { lng: interaction.locale }));
		}

		if (selected.some((r) => this.isHigherRole(r.role!, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.enable.no_higher_roles', { lng: interaction.locale }));
		}

		await this.client.settings.set(
			interaction.guildId,
			Settings.TOWN_HALL_ROLES,
			selected.reduce<Record<string, string>>((prev, curr) => {
				prev[curr.hall] = curr.role!.id;
				return prev;
			}, {})
		);

		this.updateLinksAndRoles(clans);
		await interaction.editReply({
			allowedMentions: { parse: [] },
			content: roles.map((role) => `${ORANGE_NUMBERS[role.hall]} ${role.role ? `<@&${role.role.id}>` : ''}`).join('\n')
		});
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
			await Util.delay(5000);
		}
	}

	private async disable(interaction: CommandInteraction<'cached'>) {
		this.client.settings.delete(interaction.guildId, Settings.TOWN_HALL_ROLES);
		return interaction.editReply('Successfully disabled automatic Town Hall roles.');
	}
}
