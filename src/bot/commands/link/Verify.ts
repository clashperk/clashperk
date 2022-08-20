import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
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

	public async exec(interaction: CommandInteraction<'cached'>, { tag, token }: { tag: string; token: string }) {
		const data = await this.client.resolver.resolvePlayer(interaction, tag);
		if (!data) return;

		const post = await this.client.http.verifyPlayerToken(data.tag, token);
		if (post.status !== 'ok') {
			return interaction.editReply(this.i18n('command.verify.invalid_token', { lng: interaction.locale }));
		}

		await this.client.db
			.collection(Collections.LINKED_PLAYERS)
			.updateOne(
				{ 'user': { $ne: interaction.user.id }, 'entries.tag': data.tag },
				{ $pull: { entries: { tag: data.tag } }, $set: { user_tag: interaction.user.tag } }
			);
		const up = await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
			{ 'user': interaction.user.id, 'entries.tag': data.tag },
			{
				$set: {
					'user': interaction.user.id,
					'user_tag': interaction.user.tag,
					'entries.$.verified': true,
					'entries.$.name': data.name,
					'createdAt': new Date()
				}
			}
		);

		if (!up.modifiedCount) {
			await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
				{ user: interaction.user.id },
				{
					$set: {
						user_tag: interaction.user.tag,
						user: interaction.user.id,
						createdAt: new Date()
					},
					$push: {
						entries: { tag: data.tag, name: data.name, verified: true }
					}
				},
				{ upsert: true }
			);
		}

		// Rest Link API
		this.resetLinkAPI(interaction.user.id, data.tag);
		// Update Roles
		if (data.clan) this.client.rpcHandler.roleManager.newLink(data);
		return interaction.editReply(
			this.i18n('command.verify.success', { lng: interaction.locale, info: `${data.name} (${data.tag}) ${EMOJIS.VERIFIED}` })
		);
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
