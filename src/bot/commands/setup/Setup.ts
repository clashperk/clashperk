import { Command, Flag, PrefixSupplier, Argument } from 'discord-akairo';
import { Message, TextChannel, MessageEmbed, MessageButton, MessageActionRow } from 'discord.js';
import { Flags, Collections } from '../../util/Constants';
import { Util } from '../../util/Util';

const names: { [key: string]: string } = {
	[Flags.DONATION_LOG]: 'Donation Log',
	[Flags.CLAN_FEED_LOG]: 'Clan Feed',
	[Flags.LAST_SEEN_LOG]: 'Last Seen',
	[Flags.CLAN_EMBED_LOG]: 'Clan Embed',
	[Flags.CLAN_GAMES_LOG]: 'Clan Games',
	[Flags.CLAN_WAR_LOG]: 'War Feed',
	[Flags.CHANNEL_LINKED]: 'Linked Channel'
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
					'• **[Channel Link](https://clashperk.com/guide/)**',
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
			match: msg.interaction ? 'option' : 'phrase'
		};

		if (method && (method as string).includes('setup')) return Flag.continue(method);

		const tag = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'none',
			type: (msg: Message, tag: string) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
		};

		const channel = yield {
			flag: '--channel',
			type: 'textChannel',
			match: msg.interaction ? 'option' : 'phrase'
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

		const customIds = {
			feat: this.client.uuid(message.author.id),
			list: this.client.uuid(message.author.id)
		};
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(customIds.feat)
					.setStyle('SECONDARY')
					.setLabel('Show Enabled Features')
			)
			.addComponents(
				new MessageButton()
					.setCustomId(customIds.list)
					.setStyle('SECONDARY')
					.setLabel('Show Clan List')
			);
		const msg = await message.channel.send({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector({
			filter: action => Object.values(customIds).includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customIds.feat) {
				row.components[0].setDisabled(true);
				await action.update({ components: [row] });
				const embeds = await this.getFeatures(message);
				if (!embeds.length) {
					await action.followUp({
						content: `${message.guild!.name} doesn't have any clans. Why not add some?`,
						components: []
					});
					return;
				}

				for (const chunks of Util.chunk(embeds, 10)) {
					await action.followUp({ embeds: chunks });
				}
			}

			if (action.customId === customIds.list) {
				row.components[1].setDisabled(true);
				await action.update({ components: [row] });
				const embeds = await this.getClanList(message);
				if (!embeds.length) {
					await action.followUp({
						content: `${message.guild!.name} doesn't have any clans. Why not add some?`,
						components: []
					});
					return;
				}

				await action.followUp({ embeds });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach(id => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await msg.edit({ components: [] });
		});
	}

	private async getClanList(message: Message) {
		const clans = await this.client.storage.findAll(message.guild!.id);
		const clanList = (await Promise.all(clans.map(clan => this.client.http.clan(clan.tag))))
			.filter(res => res.ok);
		if (!clans.length) return [];

		clanList.sort((a, b) => b.members - a.members);
		const nameLen = Math.max(...clanList.map(clan => clan.name.length)) + 1;
		const tagLen = Math.max(...clanList.map(clan => clan.tag.length)) + 1;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${message.guild!.name} Clans`, message.guild!.iconURL()!)
			.setDescription(
				clanList.map(
					clan => `\`\u200e${clan.name.padEnd(nameLen, ' ')} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members.toString().padStart(2, ' ')}/50 \u200f\``
				).join('\n')
			);

		return [embed];
	}

	private async getFeatures(message: Message) {
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
						roles: clan.role_ids?.map(id => message.guild!.roles.cache.get(id)?.toString()) ?? [],
						channels: clan.channels?.map(id => this.client.channels.cache.get(id)?.toString()) ?? [],
						entries: [
							{
								flag: Flags.DONATION_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit1?.channel)?.toString()
							},
							{
								flag: Flags.CLAN_FEED_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								role: message.guild!.roles.cache.get(bit2?.role)?.toString(),
								channel: this.client.channels.cache.get(bit2?.channel)?.toString()
							},
							{
								flag: Flags.LAST_SEEN_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit3?.channel)?.toString()
							},
							{
								flag: Flags.CLAN_EMBED_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit4?.channel)?.toString()
							},
							{
								flag: Flags.CLAN_GAMES_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit5?.channel)?.toString()
							},
							{
								flag: Flags.CLAN_WAR_LOG,
								ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
								channel: this.client.channels.cache.get(bit6?.channel)?.toString()
							}
						]
					};
				}
			)
		);

		return fetched.map(
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
	}
}
