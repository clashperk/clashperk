import { Flags } from '../../util/Constants';
import { Args, Command } from '../../lib';
import { CommandInteraction, Interaction, TextChannel } from 'discord.js';

export default class ChannelLinkCommand extends Command {
	public constructor() {
		super('setup-channel-link', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			defer: true,
			ephemeral: true
		});
	}

	public args(interaction: Interaction<'cached'>): Args {
		return {
			channel: {
				match: 'CHANNEL',
				default: interaction.channel
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; channel: TextChannel }) {
		const data = await this.client.resolver.enforceSecurity(interaction, args.tag);
		if (!data) return;

		const id = await this.client.storage.register(interaction, {
			op: Flags.CHANNEL_LINKED,
			guild: interaction.guild.id,
			name: data.name,
			tag: data.tag
		});

		await this.client.rpcHandler.add(id, {
			op: Flags.CHANNEL_LINKED,
			tag: data.tag,
			guild: interaction.guild.id
		});

		const store = await this.client.storage.collection.findOne({ channels: args.channel.id });
		if (store) {
			return interaction.editReply(
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				`**${store.name} (${store.tag})** is already linked to ${args.channel.toString()}`
			);
		}

		const { upsertedCount, upsertedId } = await this.client.storage.collection.updateOne(
			{ guild: interaction.guild.id, tag: data.tag },
			{
				$set: {
					name: data.name,
					tag: data.tag,
					paused: false,
					verified: true,
					active: true,
					guild: interaction.guild.id,
					patron: this.client.patrons.get(interaction.guild.id)
				},
				$push: {
					channels: args.channel.id
				},
				$bit: {
					flag: { or: Flags.CHANNEL_LINKED }
				},
				$min: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		if (upsertedCount) {
			await this.client.rpcHandler.add(upsertedId.toHexString(), {
				op: Flags.CHANNEL_LINKED,
				guild: interaction.guild.id,
				tag: data.tag
			});
		}

		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return interaction.editReply(`Successfully linked **${data.name} (${data.tag})** to ${args.channel.toString()}`);
	}
}
