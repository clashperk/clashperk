import { Args, Command } from '../../lib';
import { MessageEmbed, GuildMember, MessageActionRow, MessageButton, CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Clan, Player } from 'clashofclans.js';

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
			return interaction.editReply({
				content: '**You must provide a valid argument to run this command, check examples and usage below.**'
			});
		}

		const member = args.member ?? interaction.member;
		if (member.user.bot) return interaction.editReply("Bots can't link accounts.");

		const tags = await Promise.all([this.client.http.clan(args.tag), this.client.http.player(args.tag)]);
		const types: Record<string, string> = {
			1: 'CLAN',
			2: 'PLAYER'
		};

		if (tags.every((a) => a.ok)) {
			const embed = new MessageEmbed().setDescription(
				[
					'**What would you like to link? A Player or a Clan?**',
					'',
					tags.map((a, i) => `**${types[i + 1]}**\n${a.name} (${a.tag})\n`).join('\n')
				].join('\n')
			);

			const CUSTOM_ID = {
				CLAN: this.client.uuid(interaction.user.id),
				PLAYER: this.client.uuid(interaction.user.id),
				CANCEL: this.client.uuid(interaction.user.id)
			};
			const row = new MessageActionRow()
				.addComponents(new MessageButton().setStyle('PRIMARY').setLabel('Link Player').setCustomId(CUSTOM_ID.PLAYER))
				.addComponents(new MessageButton().setStyle('PRIMARY').setLabel('Link Clan').setCustomId(CUSTOM_ID.CLAN))
				.addComponents(new MessageButton().setStyle('DANGER').setLabel('Cancel').setCustomId(CUSTOM_ID.CANCEL));

			const msg = await interaction.editReply({ embeds: [embed], components: [row] });
			const collector = msg.createMessageComponentCollector({
				filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
				time: 5 * 60 * 1000
			});

			collector.on('collect', async (action) => {
				if (action.customId === CUSTOM_ID.CLAN) {
					await action.update({ components: [] });
					await this.clanLink(member, tags[0]);
				}

				if (action.customId === CUSTOM_ID.PLAYER) {
					await action.update({ components: [] });
					await this.playerLink(interaction, { player: tags[1], member, def: Boolean(args.default) });
				}

				if (action.customId === CUSTOM_ID.CANCEL) {
					await action.update({
						embeds: [],
						components: [],
						content: '**This command has been cancelled.**'
					});
				}
			});

			collector.on('end', async (_, reason) => {
				Object.values(CUSTOM_ID).forEach((id) => this.client.components.delete(id));
				if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
			});
		} else if (tags[0].ok) {
			return this.clanLink(member, tags[0]);
		} else if (tags[1].ok) {
			return this.playerLink(interaction, { player: tags[1], member, def: Boolean(args.default) });
		} else {
			return interaction.editReply("**I have tried to search the tag as a clan and player but couldn't find a match.**");
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
			return interaction.editReply(`**${member.user.tag}** is already linked to **${player.name} (${player.tag})**`);
		}

		if (doc && doc.user !== member.id) {
			return interaction.editReply(
				[
					`**${player.name} (${player.tag})** is already linked to another Discord account.`,
					'',
					'If you own this player account, you can Force-Link using Player API Token.',
					`Type \`/help verify\` to know more about the Player API Token.`
				].join('\n')
			);
		}

		if (doc && doc.entries.length >= 25) {
			return interaction.editReply('You can only link 25 player accounts.');
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
		this.resetLinkAPI(member.id, player.tag);
		// Update Role
		if (player.clan) this.client.rpcHandler.roleManager.newLink(player);

		return interaction.editReply(`Linked **${member.user.tag}** to **${player.name}** (${player.tag})`);
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
