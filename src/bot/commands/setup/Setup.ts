import { Message, TextChannel, MessageEmbed } from 'discord.js';
import { Command, Flag, PrefixSupplier, Argument } from 'discord-akairo';
import { BitField, Collections } from '@clashperk/node';

const names: { [key: string]: string } = {
	[BitField.DONATION_LOG]: 'Donation Log',
	[BitField.CLAN_FEED_LOG]: 'Clan Feed',
	[BitField.LAST_SEEN_LOG]: 'Last Seen',
	[BitField.CLAN_EMBED_LOG]: 'Clan Embed',
	[BitField.CLAN_GAMES_LOG]: 'Clan Games',
	[BitField.CLAN_WAR_LOG]: 'War Feed',
	[BitField.CHANNEL_LINKED]: 'Linked Channel'
};

export default class SetupCommand extends Command {
	public constructor() {
		super('setup', {
			aliases: ['setup'],
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Enable features or assign clans to channels.',
					'',
					'• **[Commands Only](https://clashperk.com)**',
					'• `#CLAN_TAG #CHANNEL`',
					'',
					'• **[Clan Feed](https://clashperk.com)**',
					'• `FEED #CLAN_TAG`',
					'• `FEED #CLAN_TAG @ROLE`',
					'',
					'• **[War Feed](https://clashperk.com)**',
					'• `WAR #CLAN_TAG`',
					'',
					'• **[Last Seen](https://clashperk.com)**',
					'• `LASTSEEN #CLAN_TAG`',
					'• `LASTSEEN #CLAN_TAG #HEX_COLOR`',
					'',
					'• **[Clan Games](https://clashperk.com)**',
					'• `GAMES #CLAN_TAG`',
					'• `GAMES #CLAN_TAG #HEX_COLOR`',
					'',
					'• **[Clan Embed](https://clashperk.com)**',
					'• `EMBED #CLAN_TAG`',
					'',
					'• **[Donation Log](https://clashperk.com)**',
					'• `DONATION #CLAN_TAG`',
					'• `DONATION #CLAN_TAG #HEX_COLOR`'
				],
				usage: '[#clanTag|Type] [#channel] [args]',
				examples: [
					'#8QU8J9LP #clashperk',
					'FEED #8QU8J9LP @ROLE',
					'LASTSEEN #8QU8J9LP #ff0'
				]
			},
			optionFlags: ['--type', '--tag', '--channel']
		});
	}

	public *args(msg: Message) {
		const method = yield {
			type: Argument.union(
				[
					['setup-clan-embed', 'embed', 'clanembed'],
					['setup-last-seen', 'lastseen', 'lastonline'],
					['setup-clan-feed', 'feed', 'memberlog', 'clan-feed'],
					['setup-donations', 'donation', 'donations', 'donation-log'],
					['setup-clan-games', 'game', 'games', 'clangames', 'cgboard'],
					['setup-clan-wars', 'war', 'wars', 'clanwarlog', 'clan-wars', 'war-feed']
				],
				(msg: Message, tag: string) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
			),
			flag: '--type',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		if (method && (method as string).includes('setup')) return Flag.continue(method);

		const tag = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'none',
			type: (msg: Message, tag: string) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
		};

		const channel = yield {
			flag: '--channel',
			type: 'textChannel',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { channel, tag: tag ? tag : method };
	}

	public async exec(message: Message, { channel, tag }: { channel?: TextChannel; tag?: string }) {
		if (channel && tag) {
			return this.handler.handleDirectCommand(message, `${tag} ${channel.id}`, this.handler.modules.get('link-clan')!);
		}

		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setDescription([
				`\`${prefix}setup ${this.description.usage as string}\``,
				'',
				this.description.content.join('\n'),
				'',
				'**Examples**',
				this.description.examples.map((en: string) => `\`${prefix}setup ${en}\``).join('\n')
			]);

		await message.channel.send({ embed });
		const clans = await this.client.storage.findAll(message.guild!.id);
		const fetched = await Promise.all(
			clans.map(
				async clan => {
					const bit1 = await this.client.db.collection(Collections.DONATION_LOGS)
						.findOne({ clan_id: clan._id });
					const bit2 = await this.client.db.collection(Collections.CLAN_FEED_LOGS)
						.findOne({ clan_id: clan._id });
					const bit3 = await this.client.db.collection(Collections.LAST_SEEN_LOGS)
						.findOne({ clan_id: clan._id });
					const bit4 = await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
						.findOne({ clan_id: clan._id });
					const bit5 = await this.client.db.collection(Collections.CLAN_GAMES_LOGS)
						.findOne({ clan_id: clan._id });
					const bit6 = await this.client.db.collection(Collections.CLAN_WAR_LOGS)
						.findOne({ clan_id: clan._id });
					const bit7 = await this.client.db.collection(Collections.LINKED_CHANNELS)
						.find({ guild: clan.guild, tag: clan.tag })
						.toArray();

					return {
						name: clan.name, tag: clan.tag,
						channels: bit7.map((en: any) => this.client.channels.cache.get(en.channel)?.toString()),
						entries: [
							{
								flag: BitField.DONATION_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit1?.channel)?.toString()
							},
							{
								flag: BitField.CLAN_FEED_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit2?.channel)?.toString()
							},
							{
								flag: BitField.LAST_SEEN_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit3?.channel)?.toString()
							},
							{
								flag: BitField.CLAN_EMBED_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit4?.channel)?.toString()
							},
							{
								flag: BitField.CLAN_GAMES_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit5?.channel)?.toString()
							},
							{
								flag: BitField.CLAN_WAR_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit6?.channel)?.toString()
							}
						]
					};
				}
			)
		);

		if (fetched.length) {
			const embed = new MessageEmbed()
				.setAuthor(`${message.guild!.name} (${message.guild!.id})`)
				.setDescription(`Enabled Features and Linked Clans (${fetched.length})`);

			fetched.map(
				(clan, num) => {
					const heads = clan.channels.filter(en => en).join(', ');
					const rest = num === (fetched.length - 1) ? '' : '\n\u200b';
					const features = clan.entries.filter(en => en.ok && en.channel);
					return embed.addField(
						`\u200e${clan.name} (${clan.tag})`,
						`${heads ? `${heads}\n` : ''}${features.map(en => `**${names[en.flag]}**\n${en.channel!}`).join('\n')}${rest}`
					);
				}
			);

			return message.util!.send({ embed });
		}

		return message.util!.send(`${message.guild!.name} doesn't have any clans. Why not add some?`);
	}
}
