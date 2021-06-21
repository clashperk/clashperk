import { Command, Argument, PrefixSupplier } from 'discord-akairo';
import { Message, TextChannel, MessageEmbed } from 'discord.js';
import { BitField, Collections } from '@clashperk/node';
import { ObjectId } from 'mongodb';

const names: { [key: string]: string } = {
	[BitField.DONATION_LOG]: 'Donation Log',
	[BitField.CLAN_FEED_LOG]: 'Clan Feed',
	[BitField.LAST_SEEN_LOG]: 'Last Seen',
	[BitField.CLAN_EMBED_LOG]: 'Clan Embed',
	[BitField.CLAN_GAMES_LOG]: 'Clan Games',
	[BitField.CLAN_WAR_LOG]: 'War Feed',
	[BitField.CHANNEL_LINKED]: 'Linked Channel'
};

export default class RemoveCommand extends Command {
	public constructor() {
		super('remove', {
			aliases: ['remove', 'stop', 'toggle', 'delete', 'disable'],
			category: 'setup',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: [
					'Disable features or remove clans from channels.',
					'',
					'• **[Unlink Channel](https://clashperk.com/guide/)**',
					'• `#CHANNEL`',
					'',
					'• **[Clan Feed](https://clashperk.com/guide/)**',
					'• `FEED #CLAN_TAG`',
					'',
					'• **[War Feed](https://clashperk.com/guide/)**',
					'• `WAR #CLAN_TAG`',
					'',
					'• **[Last Seen](https://clashperk.com/guide/)**',
					'• `LASTSEEN #CLAN_TAG`',
					'',
					'• **[Clan Games](https://clashperk.com/guide/)**',
					'• `GAMES #CLAN_TAG`',
					'',
					'• **[Clan Embed](https://clashperk.com/guide/)**',
					'• `EMBED #CLAN_TAG`',
					'',
					'• **[Donation Log](https://clashperk.com/guide/)**',
					'• `DONATION #CLAN_TAG`',
					'',
					'• **[Everything^](https://clashperk.com/guide/)**',
					'• `ALL #CLAN_TAG`'
				],
				usage: '<#channel|Type> <#clanTag>',
				examples: [
					'#clashperk',
					'FEED #8QU8J9LP',
					'LASTSEEN #8QU8J9LP'
				]
			},
			optionFlags: ['--channel', '--option', '--tag']
		});
	}

	public *args(msg: Message): unknown {
		const bit = yield {
			flag: ['--option', '--channel'],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: Argument.union(
				[
					['all'],
					['autorole', 'role', 'roles'],
					[BitField.CLAN_EMBED_LOG.toString(), 'embed', 'clanembed'],
					[BitField.LAST_SEEN_LOG.toString(), 'lastseen', 'lastonline'],
					[BitField.CLAN_WAR_LOG.toString(), 'war', 'wars', 'clan-wars'],
					[BitField.CLAN_GAMES_LOG.toString(), 'game', 'games', 'clangames'],
					[BitField.CLAN_FEED_LOG.toString(), 'feed', 'memberlog', 'clan-feed'],
					[BitField.DONATION_LOG.toString(), 'donation', 'donations', 'donationlog']
				],
				'textChannel'
			)
		};

		const tag = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
		};

		return { bit, tag };
	}

	public async exec(message: Message, { bit, tag }: { bit?: string | TextChannel; tag?: string }) {
		if (!bit) {
			const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setDescription([
					`\`${prefix}remove ${this.description.usage as string}\``,
					'',
					this.description.content.join('\n'),
					'',
					'**Examples**',
					this.description.examples.map((en: string) => `\`${prefix}remove ${en}\``).join('\n')
				].join('\n'));
			return message.util!.send({ embeds: [embed] });
		}

		if (bit instanceof TextChannel) {
			const { value } = await this.client.storage.collection.findOneAndUpdate(
				{ channels: bit.id }, { $pull: { channels: bit.id } }, { returnOriginal: false }
			);

			if (value) {
				const id = value._id.toHexString();
				if (!value.channels?.length) await this.updateFlag(id, BitField.CHANNEL_LINKED);
				return message.util!.send(
					`Successfully deleted **${value.name} (${value.tag})** from <#${bit.id}>`
				);
			}

			// eslint-disable-next-line
			return message.util!.send(`Couldn\'t find any clan linked to ${bit.toString()}`);
		}

		if (bit === 'autorole') {
			await this.client.db.collection(Collections.CLAN_STORES)
				.updateMany(
					{ guild: message.guild!.id, autoRole: 2 },
					{ $unset: { autoRole: '', roles: '', role_ids: '', secureRole: '' } }
				);
			return message.util!.send(`**Autorole disabled for all clans.**`);
		}

		if (!tag) return message.util!.send('**You must specify a clan tag to run this command.**');

		const data = await this.client.db.collection(Collections.CLAN_STORES)
			.findOne({ tag, guild: message.guild!.id });

		if (bit === 'autorole' && data) {
			await this.client.db.collection(Collections.CLAN_STORES)
				.updateMany(
					{ guild: message.guild!.id, tag: data.tag, autoRole: 1 },
					{ $unset: { autoRole: '', roles: '', role_ids: '', secureRole: '' } }
				);
			return message.util!.send(`Autorole disabled for **${data.name as string} (${data.tag as string})**`);
		}

		if (!data) {
			return message.util!.send('**I couldn\'t find this clan tag in this server!**');
		}

		const id = data._id.toHexString();
		if (bit === 'all') {
			await this.client.storage.delete(id);
			await this.client.rpcHandler.delete(id, { tag: data.tag, op: 0, guild: message.guild!.id });
			return message.util!.send(`**Successfully Deleted ${data.name as string} (${data.tag as string})**`);
		}

		const deleted = await this.client.storage.remove(data._id, { op: Number(bit) });
		if (deleted?.deletedCount) await this.updateFlag(id, Number(bit));
		await this.client.rpcHandler.delete(id, { op: Number(bit), tag: data.tag, guild: message.guild!.id });

		await this.delete(id, data.tag, data.flag, message.guild!.id);
		return message.util!.send(`**Successfully Removed ${names[bit]} for ${data.name as string} (${data.tag as string})**`);
	}

	private async delete(id: string, tag: string, flag: number, guild: string) {
		const data = await Promise.all([
			this.client.db.collection(Collections.DONATION_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_FEED_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.LAST_SEEN_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_EMBED_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_GAMES_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_WAR_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) })
		]).then(collection => collection.every(num => num === 0));

		const bit = BitField.CHANNEL_LINKED;
		if (data && (flag & bit) !== bit) {
			this.client.rpcHandler.delete(id, { tag, op: 0, guild });
			return this.client.db.collection(Collections.CLAN_STORES)
				.updateOne({ _id: new ObjectId(id) }, { $set: { flag: 0 } });
		}
	}

	private updateFlag(id: string, bit: number) {
		return this.client.db.collection(Collections.CLAN_STORES)
			.updateOne({ _id: new ObjectId(id) }, { $bit: { flag: { xor: bit } } });
	}
}
