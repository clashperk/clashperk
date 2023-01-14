import { CommandInteraction } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { PlayerLinks } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class VerifyPlayerCommand extends Command {
	public constructor() {
		super('verify', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: 'Verify and Link a Player using API Token.'
			},
			defer: true,
			ephemeral: true
		});
	}

	public args(): Args {
		return {
			player_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, { tag, token }: { tag: string; token: string }) {
		const data = await this.client.resolver.resolvePlayer(interaction, tag);
		if (!data) return;

		const post = await this.client.http.verifyPlayerToken(data.tag, token);
		if (post.status !== 'ok') {
			return interaction.editReply(this.i18n('command.verify.invalid_token', { lng: interaction.locale }));
		}

		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		await collection.deleteOne({ userId: { $ne: interaction.user.id }, tag: data.tag });
		const lastAccount = await collection.findOne({ userId: interaction.user.id }, { sort: { order: -1 } });
		await collection.updateOne(
			{ userId: interaction.user.id, tag: data.tag },
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

	private async resetLinkAPI(userId: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(userId, tag);
	}
}
