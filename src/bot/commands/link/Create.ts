import { GuildMember, CommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
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
		interaction: CommandInteraction,
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
		if (player.clan) this.client.rpcHandler.roleManager.newLink(player);

		return interaction.editReply(
			this.i18n('command.link.create.success', {
				lng: interaction.locale,
				user: `**${member.user.tag}**`,
				target: `**${player.name} (${player.tag})**`
			})
		);
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
