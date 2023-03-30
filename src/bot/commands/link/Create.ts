import { GuildMember, CommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';

export default class LinkCreateCommand extends Command {
	public constructor() {
		super('link-create', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Links a Player or Clan to a Discord account.']
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			default: {
				match: 'BOOLEAN'
			},
			user: {
				id: 'member',
				match: 'MEMBER'
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { player_tag?: string; clan_tag?: string; member?: GuildMember; default?: boolean; forcePlayer?: boolean }
	) {
		if (!(args.clan_tag || args.player_tag)) {
			const linkButton = new ButtonBuilder()
				.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: 'hidden' }))
				.setLabel('Link account')
				.setEmoji('🔗')
				.setStyle(ButtonStyle.Primary);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

			return interaction.editReply({
				content: this.i18n('command.link.no_tag', { lng: interaction.locale }),
				components: [row]
			});
		}

		const member = args.member ?? interaction.member;
		if (member.user.bot) return interaction.editReply(this.i18n('command.link.create.no_bots', { lng: interaction.locale }));

		if (interaction.user.id !== member.user.id) {
			this.client.logger.debug(
				`${interaction.user.tag} (${
					interaction.user.id
				}) attempted to link [clan_tag: ${args.clan_tag!}] [player_tag: ${args.player_tag!}] on behalf of ${member.user.tag} (${
					member.user.id
				})`,
				{ label: 'LINK' }
			);
		}

		if (args.player_tag) {
			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return null;
			return this.playerLink(interaction, { player, member, def: Boolean(args.default) });
		}

		if (args.clan_tag) {
			const clan = await this.client.resolver.resolveClan(interaction, args.clan_tag);
			if (!clan) return null;

			await this.clanLink(member, clan);
			return interaction.editReply(
				this.i18n('command.link.create.success', {
					lng: interaction.locale,
					user: `**${member.user.tag}**`,
					target: `**${clan.name} (${clan.tag})**`
				})
			);
		}

		return interaction.editReply(this.i18n('command.link.create.fail', { lng: interaction.locale }));
	}

	private async clanLink(member: GuildMember, clan: Clan) {
		return this.client.db.collection(Collections.USERS).updateOne(
			{ userId: member.id },
			{
				$set: {
					clan: {
						tag: clan.tag,
						name: clan.name
					},
					username: member.user.tag,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	public async playerLink(
		interaction: CommandInteraction<'cached'>,
		{ player, member, def }: { player: Player; member: GuildMember; def: boolean }
	) {
		const [doc, accounts] = await this.getPlayer(player.tag, member.id);
		// only owner can set default account
		if (doc && doc.userId === member.id && ((def && member.id !== interaction.user.id) || !def)) {
			await this.resetLinkAPI(member.id, player.tag);
			return interaction.editReply(
				this.i18n('command.link.create.link_exists', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
			);
		}

		if (doc && doc.userId !== member.id) {
			return interaction.editReply(
				this.i18n('command.link.create.already_linked', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
			);
		}

		if (doc && accounts.length >= 25) {
			return interaction.editReply(this.i18n('command.link.create.max_limit', { lng: interaction.locale }));
		}

		await this.client.db
			.collection<UserInfoModel>(Collections.USERS)
			.updateOne({ userId: member.id }, { $set: { username: member.user.tag } });

		await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).updateOne(
			{ tag: player.tag },
			{
				$set: {
					userId: member.id,
					username: member.user.tag,
					name: player.name,
					tag: player.tag,
					order: def
						? Math.min(0, ...accounts.map((account) => account.order)) - 1
						: Math.min(0, ...accounts.map((account) => account.order)) + 1,
					verified: doc?.verified ?? false,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		// Fix Conflicts
		await this.resetLinkAPI(member.id, player.tag);
		// Update Role
		// if (player.clan) this.client.rpcHandler.roleManager.newLink(player);

		await interaction.editReply(
			this.i18n('command.link.create.success', {
				lng: interaction.locale,
				user: `**${member.user.tag}**`,
				target: `**${player.name} (${player.tag})**`
			})
		);

		if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
			const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
			await interaction.followUp({
				content: [
					`**Click the link below to manage Discord links on our Dashboard.**`,
					'',
					`[https://clashperk.com/links](https://clashperk.com/links?token=${token})`
				].join('\n'),
				ephemeral: true
			});

			return this.updateLinksAndRoles(interaction.guild.id);
		}
	}

	private async updateLinksAndRoles(guildId: string) {
		const clans = await this.client.storage.find(guildId);
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
						username: user.tag,
						tag,
						name: player.name,
						verified: false,
						order: lastAccount?.order ? lastAccount.order + 1 : 0,
						createdAt: new Date()
					});
				} catch {}
			}
		}
	}

	private async getPlayer(tag: string, userId: string) {
		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		return Promise.all([collection.findOne({ tag }), collection.find({ userId }).toArray()]);
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
