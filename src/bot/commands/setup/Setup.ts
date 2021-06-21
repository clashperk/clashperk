import { Command, Flag, PrefixSupplier, Argument } from 'discord-akairo';
import { Message, TextChannel, MessageEmbed, Snowflake } from 'discord.js';
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
					'• **[Commands Only](https://clashperk.com/guide/)**',
					'• `#CLAN_TAG #CHANNEL`',
					'',
					'• **[Clan Feed](https://clashperk.com/guide/)**',
					'• `FEED #CLAN_TAG`',
					'• `FEED #CLAN_TAG @ROLE`',
					'',
					'• **[War Feed](https://clashperk.com/guide/)**',
					'• `WAR #CLAN_TAG`',
					'',
					'• **[Last Seen](https://clashperk.com/guide/)**',
					'• `LASTSEEN #CLAN_TAG`',
					'• `LASTSEEN #CLAN_TAG #HEX_COLOR`',
					'',
					'• **[Clan Games](https://clashperk.com/guide/)**',
					'• `GAMES #CLAN_TAG`',
					'• `GAMES #CLAN_TAG #HEX_COLOR`',
					'',
					'• **[Clan Embed](https://clashperk.com/guide/)**',
					'• `EMBED #CLAN_TAG`',
					'',
					'• **[Donation Log](https://clashperk.com/guide/)**',
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
			optionFlags: ['--option', '--tag', '--channel']
		});
	}

	public *args(msg: Message): unknown {
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
			flag: ['--option'],
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
			].join('\n'));

		await message.channel.send({ embeds: [embed] });
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

					return {
						name: clan.name, tag: clan.tag, alias: clan.alias ? `(${clan.alias}) ` : '',
						roles: clan.role_ids?.map(id => message.guild!.roles.cache.get(id as Snowflake)?.toString()) ?? [],
						channels: clan.channels?.map(id => this.client.channels.cache.get(id as Snowflake)?.toString()) ?? [],
						entries: [
							{
								flag: BitField.DONATION_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit1?.channel)?.toString()
							},
							{
								flag: BitField.CLAN_FEED_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								role: message.guild!.roles.cache.get(bit2?.role)?.toString(),
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

		if (!fetched.length) {
			return message.util!.send(`${message.guild!.name} doesn't have any clans. Why not add some?`);
		}

		const embeds = fetched.map(
			clan => {
				const channels = clan.channels.filter(en => en);
				const roles = clan.roles.filter(en => en);
				const features = clan.entries; // .filter(en => en.ok && en.channel);

				const embed = new MessageEmbed();
				embed.setAuthor(`\u200e${clan.name} (${clan.tag})`);
				if (channels.length) embed.setDescription(channels.join(', '));
				if (roles.length) {
					embed.addField('Roles', roles.join(' '), true);
				}
				if (features.length) {
					features.map(
						en => embed.addField(
							names[en.flag],
							en.channel ? `${en.channel} ${en.role ?? ''}` : `-`,
							true
						)
					);
				}

				return embed;
			}
		);

		for (const chunks of this.chunk(embeds)) {
			if (message.hasOwnProperty('token')) {
				await message.util!.send({ embeds: chunks });
			} else {
				// @ts-expect-error
				await this.client.api.channels[message.channel.id].messages.post({ data: { embeds: chunks } });
			}
		}
	}

	private chunk<T>(items: T[]) {
		const chunk = 10;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
