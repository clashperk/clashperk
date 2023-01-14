import { EmbedBuilder, GuildMember, ActionRowBuilder, ButtonBuilder, CommandInteraction, ButtonStyle, ComponentType } from 'discord.js';
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
		args: { tag?: string; member?: GuildMember; default?: boolean; forcePlayer?: boolean }
	) {
		if (!args.tag) {
			return interaction.editReply(this.i18n('command.link.no_tag', { lng: interaction.locale }));
		}

		const member = args.member ?? interaction.member;
		if (member.user.bot) return interaction.editReply(this.i18n('command.link.create.no_bots', { lng: interaction.locale }));

		const tags = await Promise.all([this.client.http.player(args.tag), this.client.http.clan(args.forcePlayer ? '0x' : args.tag)]);
		const types: Record<string, string> = {
			1: 'PLAYER',
			2: 'CLAN'
		};

		if (tags.every((a) => a.ok)) {
			const embed = new EmbedBuilder().setDescription(
				[
					this.i18n('command.link.create.prompt', { lng: interaction.locale }),
					'',
					tags.map((a, i) => `**${types[i + 1]}**\n${a.name} (${a.tag})\n`).join('\n')
				].join('\n')
			);

			const CUSTOM_ID = {
				CLAN: this.client.uuid(interaction.user.id),
				PLAYER: this.client.uuid(interaction.user.id)
			};
			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Link Player').setCustomId(CUSTOM_ID.PLAYER))
				.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Link Clan').setCustomId(CUSTOM_ID.CLAN));

			const msg = await interaction.editReply({ embeds: [embed], components: [row] });
			const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
				filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
				time: 5 * 60 * 1000
			});

			collector.on('collect', async (action) => {
				if (action.customId === CUSTOM_ID.CLAN) {
					await action.update({ components: [] });
					await this.clanLink(member, tags[1]);
					const clan = tags[1];
					await interaction.editReply(
						this.i18n('command.link.create.success', {
							lng: interaction.locale,
							user: `**${member.user.tag}**`,
							target: `**${clan.name} (${clan.tag})**`
						})
					);
				}

				if (action.customId === CUSTOM_ID.PLAYER) {
					await action.update({ components: [] });
					await this.playerLink(interaction, { player: tags[0], member, def: Boolean(args.default) });
				}
			});

			collector.on('end', async (_, reason) => {
				Object.values(CUSTOM_ID).forEach((id) => this.client.components.delete(id));
				if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
			});
		} else if (tags[0].ok) {
			return this.playerLink(interaction, { player: tags[0], member, def: Boolean(args.default) });
		} else if (tags[1].ok) {
			await this.clanLink(member, tags[1]);
			const clan = tags[1];
			return interaction.editReply(
				this.i18n('command.link.create.success', {
					lng: interaction.locale,
					user: `**${member.user.tag}**`,
					target: `**${clan.name} (${clan.tag})**`
				})
			);
		} else {
			return interaction.editReply(this.i18n('command.link.create.fail', { lng: interaction.locale }));
		}
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

		// only owner can set default account
		if (def && member.id === interaction.user.id) {
			await this.client.db
				.collection<UserInfoModel>(Collections.USERS)
				.updateOne({ userId: member.id }, { $set: { username: member.user.tag, player: { name: player.name, tag: player.tag } } });
		}

		await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).updateOne(
			{ tag: player.tag },
			{
				$set: {
					userId: member.id,
					username: member.user.tag,
					name: player.name,
					tag: player.tag,
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
