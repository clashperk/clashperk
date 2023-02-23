import { GuildMember, ModalBuilder, ComponentType, TextInputStyle, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class LinkAddCommand extends Command {
	public constructor() {
		super('link-add', {
			category: 'none',
			channel: 'guild'
		});
	}

	public async exec(interaction: ButtonInteraction<'cached'>) {
		if (interaction.isButton()) return this.modal(interaction);
	}

	private async playerLink(
		interaction: ModalSubmitInteraction<'cached'>,
		{ player, member, def }: { player: Player; member: GuildMember; def: boolean; token?: string }
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

	private async modal(interaction: ButtonInteraction<'cached'>) {
		const customIds = {
			modal: 'link_modal'
		};

		const modal = new ModalBuilder({
			customId: customIds.modal,
			title: 'Link a Player Account',
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							style: TextInputStyle.Short,
							customId: 'tag',
							required: true,
							label: 'Player Tag',
							placeholder: 'Enter the Player Tag.',
							maxLength: 15
						}
					]
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							style: TextInputStyle.Short,
							required: false,
							customId: 'token',
							label: 'API Token (Optional)',
							placeholder: 'The API token can be found in the game settings.',
							maxLength: 15
						}
					]
				}
			]
		});
		await interaction.showModal(modal);

		try {
			await interaction
				.awaitModalSubmit({
					time: 5 * 60 * 1000,
					filter: (action) => action.customId === customIds.modal
				})
				.then(async (modalSubmit) => {
					const tag = modalSubmit.fields.getTextInputValue('tag');
					const token = modalSubmit.fields.getTextInputValue('token');
					await modalSubmit.deferReply({ ephemeral: true });

					const data = await this.client.http.player(tag);
					if (!data.ok) {
						return modalSubmit.editReply({ content: 'Invalid player tag was provided.' });
					}

					if (token) {
						return this.verify(modalSubmit, data, token);
					}

					return this.playerLink(modalSubmit, { player: data, member: interaction.member, def: false });
				});
		} catch (e) {
			console.log(e);
		}
	}

	private async verify(interaction: ModalSubmitInteraction<'cached'>, data: Player, token: string) {
		const post = await this.client.http.verifyPlayerToken(data.tag, token);
		if (post.status !== 'ok') {
			return interaction.editReply(this.i18n('command.verify.invalid_token', { lng: interaction.locale }));
		}

		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		await collection.deleteOne({ userId: { $ne: interaction.user.id }, tag: data.tag });
		const lastAccount = await collection.findOne({ userId: interaction.user.id }, { sort: { order: -1 } });
		await collection.updateOne(
			{ tag: data.tag },
			{
				$set: {
					userId: interaction.user.id,
					username: interaction.user.tag,
					name: data.name,
					tag: data.tag,
					verified: true,
					updatedAt: new Date()
				},
				$setOnInsert: {
					order: lastAccount ? lastAccount.order + 1 : 0,
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		// Rest Link API
		this.resetLinkAPI(interaction.user.id, data.tag);
		// Update Roles
		if (data.clan) this.client.rpcHandler.roleManager.newLink(data);
		return interaction.editReply(
			this.i18n('command.verify.success', { lng: interaction.locale, info: `${data.name} (${data.tag}) ${EMOJIS.VERIFIED}` })
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
