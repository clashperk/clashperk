import { Command } from '../../lib';
import { Collections } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Player } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';

export default class VerifyPlayerCommand extends Command {
	public constructor() {
		super('verify', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Verify and Link a Player using API Token.',
					'',
					"A token can only be used just for once. So don't worry, others can't use it again."
				]
			},
			defer: true,
			ephemeral: true
		});
	}

	private retry(interaction: CommandInteraction, text: string) {
		return interaction.editReply(
			[
				`**${text}**`,
				'',
				"A token can only be used just for once. So don't worry, others can't use it again!",
				'',
				'**Usage**',
				`\`/verify <#playerTag> <token>\``,
				'',
				'**How to get this token?**',
				'',
				'- Go to **Settings >> More Settings**',
				'- Scroll down and find **API Token**',
				'- Tap **Show** and then **Copy**',
				'https://i.imgur.com/8dsoUB8.jpg'
			].join('\n')
		);
	}

	public async exec(interaction: CommandInteraction<'cached'>, { tag, token }: { tag?: string; token?: string }) {
		if (!tag || !token) {
			return this.retry(interaction, `You must provide a player tag and a token!`);
		}

		const data: Player = await this.client.http.player(tag);
		if (!data.ok) {
			return this.retry(interaction, `You must provide a valid player tag${token ? '' : ' and a token'}!`);
		}

		const post = await this.client.http.verifyPlayerToken(data.tag, token);
		if (post.status !== 'ok') {
			return this.retry(interaction, `You must provide a valid API Token!`);
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
		return interaction.editReply(`**Verification successful! ${data.name} (${data.tag})** ${EMOJIS.VERIFIED}`);
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
