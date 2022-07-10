import { MessageEmbed, GuildMember, MessageActionRow, MessageButton, CommandInteraction } from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import { Args, Command } from '../../lib';
import { Collections } from '../../util/Constants';

export default class LinkCreateCommand extends Command {
	public constructor() {
		super('link-create', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
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

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; member?: GuildMember; default?: boolean }) {
		if (!args.tag) {
			return interaction.editReply(this.i18n('command.link.no_tag', { lng: interaction.locale }));
		}

		const member = args.member ?? interaction.member;
		if (member.user.bot) return interaction.editReply(this.i18n('command.link.create.no_bots', { lng: interaction.locale }));

		const tags = await Promise.all([this.client.http.player(args.tag), this.client.http.clan(args.tag)]);
		const types: Record<string, string> = {
			1: 'PLAYER',
			2: 'CLAN'
		};

		if (tags.every((a) => a.ok)) {
			const embed = new MessageEmbed().setDescription(
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
			const row = new MessageActionRow()
				.addComponents(new MessageButton().setStyle('PRIMARY').setLabel('Link Player').setCustomId(CUSTOM_ID.PLAYER))
				.addComponents(new MessageButton().setStyle('PRIMARY').setLabel('Link Clan').setCustomId(CUSTOM_ID.CLAN));

			const msg = await interaction.editReply({ embeds: [embed], components: [row] });
			const collector = msg.createMessageComponentCollector({
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
		return this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
			{ user: member.id },
			{
				$set: {
					clan: {
						tag: clan.tag,
						name: clan.name
					},
					user_tag: member.user.tag
				},
				$setOnInsert: {
					entries: [],
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
		const doc = await this.getPlayer(player.tag);
		// only owner can set default account
		if (doc && doc.user === member.id && ((def && member.id !== interaction.user.id) || !def)) {
			await this.resetLinkAPI(member.id, player.tag);
			return interaction.editReply(
				this.i18n('command.link.create.link_exists', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
			);
		}

		if (doc && doc.user !== member.id) {
			return interaction.editReply(
				this.i18n('command.link.create.already_linked', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
			);
		}

		if (doc && doc.entries.length >= 25) {
			return interaction.editReply(this.i18n('command.link.create.max_limit', { lng: interaction.locale }));
		}

		// only owner can set default account
		if (def && member.id === interaction.user.id) {
			await this.client.db
				.collection(Collections.LINKED_PLAYERS)
				.updateOne({ user: member.id }, { $set: { user_tag: member.user.tag }, $pull: { entries: { tag: player.tag } } });
		}

		await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
			{ user: member.id },
			{
				$set: {
					user_tag: member.user.tag,
					user: member.id,
					createdAt: new Date()
				},
				$push:
					def && member.id === interaction.user.id // only owner can set default account
						? {
								entries: {
									$each: [{ tag: player.tag, name: player.name, verified: this.isVerified(doc, player.tag) }],
									$position: 0
								}
						  }
						: {
								entries: { tag: player.tag, name: player.name, verified: false }
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

	private isVerified(data: any, tag: string) {
		return Boolean(data?.entries.find((en: any) => en.tag === tag && en.verified));
	}

	private async getPlayer(tag: string) {
		return this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
