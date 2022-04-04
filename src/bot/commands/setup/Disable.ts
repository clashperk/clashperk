import { Args, Command } from '../../lib';
import { CommandInteraction, TextChannel } from 'discord.js';
import { Flags, Collections } from '../../util/Constants';
import { ObjectId } from 'mongodb';

const names: Record<string, string> = {
	[Flags.DONATION_LOG]: 'Donation Log',
	[Flags.CLAN_FEED_LOG]: 'Clan Feed',
	[Flags.LAST_SEEN_LOG]: 'Last Seen',
	[Flags.CLAN_EMBED_LOG]: 'Clan Embed',
	[Flags.CLAN_GAMES_LOG]: 'Clan Games',
	[Flags.CLAN_WAR_LOG]: 'War Feed',
	[Flags.CHANNEL_LINKED]: 'Linked Channel'
};

export default class SetupDisableCommand extends Command {
	public constructor() {
		super('setup-disable', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			userPermissions: ['MANAGE_GUILD'],
			defer: true,
			ephemeral: true
		});
	}

	public args(interaction: CommandInteraction<'cached'>): Args {
		return {
			option: {
				match: 'ENUM',
				enums: [
					['channel-link'],
					['all', 'remove-clan'],
					['auto-role'],
					[Flags.CLAN_EMBED_LOG.toString(), 'clan-embed'],
					[Flags.LAST_SEEN_LOG.toString(), 'lastseen'],
					[Flags.CLAN_WAR_LOG.toString(), 'war-feed'],
					[Flags.CLAN_GAMES_LOG.toString(), 'clan-games'],
					[Flags.CLAN_FEED_LOG.toString(), 'clan-feed'],
					[Flags.DONATION_LOG.toString(), 'donation-log']
				]
			},
			channel: {
				match: 'CHANNEL',
				default: interaction.channel!
			}
		};
	}

	private parseTag(tag?: string) {
		return tag ? this.client.http.fixTag(tag) : undefined;
	}

	public async exec(interaction: CommandInteraction, { option, tag, channel }: { option: string; channel: TextChannel; tag?: string }) {
		tag = this.parseTag(tag);
		if (option === 'channel-link') {
			const { value } = await this.client.storage.collection.findOneAndUpdate(
				{ channels: channel.id },
				{ $pull: { channels: channel.id } },
				{ returnDocument: 'after' }
			);

			if (value) {
				const id = value._id.toHexString();
				if (!value.channels?.length) await this.updateFlag(id, Flags.CHANNEL_LINKED);
				return interaction.editReply(`Successfully deleted **${value.name} (${value.tag})** from <#${channel.id}>`);
			}

			// eslint-disable-next-line
			return interaction.editReply(`Couldn't find any clan linked to ${channel.toString()}`);
		}

		if (option === 'auto-role' && !tag) {
			await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany(
					{ guild: interaction.guild!.id, autoRole: 2 },
					{ $unset: { autoRole: '', roles: '', role_ids: '', secureRole: '' } }
				);
			return interaction.editReply(`**Auto-role disabled for all clans.**`);
		}

		if (!tag) return interaction.editReply('**You must specify a clan tag to run this command.**');
		const data = await this.client.db.collection(Collections.CLAN_STORES).findOne({ tag, guild: interaction.guild!.id });

		if (option === 'auto-role' && data) {
			await this.client.db
				.collection(Collections.CLAN_STORES)
				.updateMany(
					{ guild: interaction.guild!.id, tag: data.tag, autoRole: 1 },
					{ $unset: { autoRole: '', roles: '', role_ids: '', secureRole: '' } }
				);
			return interaction.editReply(`Auto-role disabled for **${data.name as string} (${data.tag as string})**`);
		}

		if (!data) {
			return interaction.editReply("**I couldn't find this clan tag in this server!**");
		}

		const id = data._id.toHexString();
		if (option === 'all') {
			await this.client.storage.delete(id);
			await this.client.rpcHandler.delete(id, { tag: data.tag, op: 0, guild: interaction.guild!.id });
			return interaction.editReply(`**Successfully Deleted ${data.name as string} (${data.tag as string})**`);
		}

		const deleted = await this.client.storage.remove(data._id.toHexString(), { op: Number(option) });
		if (deleted?.deletedCount) await this.updateFlag(id, Number(option));
		await this.client.rpcHandler.delete(id, { op: Number(option), tag: data.tag, guild: interaction.guild!.id });

		await this.delete(id, data.tag, data.flag, interaction.guild!.id);
		return interaction.editReply(`**Successfully Removed ${names[option]} for ${data.name as string} (${data.tag as string})**`);
	}

	private async delete(id: string, tag: string, flag: number, guild: string) {
		const data = await Promise.all([
			this.client.db.collection(Collections.DONATION_LOGS).countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_FEED_LOGS).countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.LAST_SEEN_LOGS).countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_EMBED_LOGS).countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_GAMES_LOGS).countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_WAR_LOGS).countDocuments({ clan_id: new ObjectId(id) })
		]).then((collection) => collection.every((num) => num === 0));

		const option = Flags.CHANNEL_LINKED;
		if (data && (flag & option) !== option) {
			this.client.rpcHandler.delete(id, { tag, op: 0, guild });
			return this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: new ObjectId(id) }, { $set: { flag: 0 } });
		}
	}

	private updateFlag(id: string, option: number) {
		return this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: new ObjectId(id) }, { $bit: { flag: { xor: option } } });
	}
}
