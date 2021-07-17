import { MessageEmbed, Message, Guild, TextChannel, Snowflake } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { Collections } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';

export default class ClansCommand extends Command {
	public constructor() {
		super('clans', {
			aliases: ['clans'],
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				usage: '<page>',
				examples: ['2'],
				content: 'Shows all clans related to the server or channel.'
			},
			args: [
				{
					'id': 'page',
					'type': Argument.range('number', 1, 100),
					'default': 1,
					'unordered': true
				},
				{
					'id': 'guild',
					'type': async (msg, id) => {
						const guilds = await this.client.shard!.broadcastEval(
							(client, id) => {
								const guild = client.guilds.cache.get(id as Snowflake);
								if (guild) {
									return {
										id: guild.id,
										name: guild.name,
										iconURL: guild.iconURL(),
										memberCount: guild.memberCount
									};
								}
								return null;
							}, { context: id }
						);
						const guild = guilds.find(guild => guild !== null);
						if (!guild) return null;
						return guild;
					},
					'default': (message: Message) => message.guild,
					'unordered': true
				}
			]
		});
	}

	public async exec(message: Message, { guild, page }: { guild: Guild; page: number }) {
		const mods = message.guild!.id === '509784317598105619' && message.member!.permissions.has('MANAGE_GUILD') ? [message.author.id] : [];
		if (!(this.client.isOwner(message.author.id) || mods.includes(message.author.id))) {
			return this.handler.handleDirectCommand(message, '-', this.handler.modules.get('setup')!);
		}
		await message.util!.send(`**Feching data... ${EMOJIS.LOADING}**`);

		const premium = this.client.patrons.get(guild.id);
		const clans = await this.client.storage.findAll(guild.id);
		const data = await Promise.all(clans.map(async doc => {
			const donationlog = await this.client.db.collection(Collections.DONATION_LOGS).findOne({ clan_id: doc._id });
			const playerlog = await this.client.db.collection(Collections.CLAN_FEED_LOGS).findOne({ clan_id: doc._id });
			const onlinelog = await this.client.db.collection(Collections.LAST_SEEN_LOGS).findOne({ clan_id: doc._id });
			const clanembed = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clan_id: doc._id });
			const clangames = await this.client.db.collection(Collections.CLAN_GAMES_LOGS).findOne({ clan_id: doc._id });
			const clanwar = await this.client.db.collection(Collections.CLAN_WAR_LOGS).findOne({ clan_id: doc._id });
			const channels = await this.client.db.collection(Collections.LINKED_CHANNELS)
				.find({ guild: guild.id, tag: doc.tag })
				.toArray();

			return {
				tag: doc.tag,
				name: doc.name,
				donationlog: donationlog && doc.active && doc.flag > 0 ? donationlog.channel : null,
				playerlog: playerlog && doc.active && doc.flag > 0 ? playerlog.channel : null,
				onlinelog: onlinelog && doc.active && doc.flag > 0 ? onlinelog.channel : null,
				clanembedlog: clanembed && doc.active && doc.flag > 0 ? clanembed.channel : null,
				clangameslog: clangames && doc.active && doc.flag > 0 ? clangames.channel : null,
				clanwarlog: clanwar && doc.active && doc.flag > 0 ? clanwar.channel : null,
				channels: channels.length ? channels : []
			};
		}));

		const icon = typeof guild.iconURL === 'function' ? guild.iconURL()! : guild.iconURL;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${guild.name}`, icon as string)
			.setTitle(`Members: ${guild.memberCount}`);
		if (!data.length) {
			embed.setDescription(`${message.guild!.name} doesn't have any clans. Why not add some?`);
			return message.util!.send({ embeds: [embed] });
		}

		const paginated = this.paginate(data, page);

		embed.setDescription([
			`${premium ? '**Patron** \nYes' : ''}`,
			'',
			this.desc(paginated)
		].join('\n'));
		embed.setFooter(`Page ${paginated.page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`);

		if (clans.length <= 2) {
			return message.util!.send({ embeds: [embed] });
		}

		const msg = await message.util!.send({ embeds: [embed] });

		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector({
			filter: (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name!) && user.id === message.author.id,
			time: 60000, max: 10
		});

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await msg.edit({
					embeds: [
						embed.setFooter(
							`Page ${this.paginate(data, page).page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`
						).setDescription([
							`${premium ? `**Patron** \nYes ${EMOJIS.AUTHORIZE}` : ''}`,
							'',
							this.desc(this.paginate(data, page))
						].join('\n'))
					]
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await msg.edit({
					embeds: [
						embed.setFooter(
							`Page ${this.paginate(data, page).page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`
						).setDescription([
							`${premium ? `**Patron** \nYes ${EMOJIS.AUTHORIZE}` : ''}`,
							'',
							this.desc(this.paginate(data, page))
						].join('\n'))
					]
				});
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}
		});

		collector.on('end', async () => msg.reactions.removeAll().catch(() => null));
	}

	private desc(paginated: any) {
		return paginated.items.map((item: any) => {
			const donationlog = this.client.channels.cache.has(item.donationlog);
			const playerlog = this.client.channels.cache.has(item.playerlog);
			const onlinelog = this.client.channels.cache.has(item.onlinelog);
			const clanembedlog = this.client.channels.cache.has(item.clanembedlog);
			const clangameslog = this.client.channels.cache.has(item.clangameslog);
			const clanwarlog = this.client.channels.cache.has(item.clanwarlog);
			const logs = [
				item.donationlog
					? donationlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.HASH} <#${item.donationlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.HASH} <#${item.donationlog as string}>`
					: '',
				item.playerlog
					? playerlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.HASH} <#${item.playerlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.HASH} <#${item.playerlog as string}>`
					: '',
				item.onlinelog
					? onlinelog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.HASH} <#${item.onlinelog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.HASH} <#${item.onlinelog as string}>`
					: '',
				item.clanembedlog
					? clanembedlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.HASH} <#${item.clanembedlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.HASH} <#${item.clanembedlog as string}>`
					: '',
				item.clangameslog
					? clangameslog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.HASH} <#${item.clangameslog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.HASH} <#${item.clangameslog as string}>`
					: '',
				item.clanwarlog
					? clanwarlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.HASH} <#${item.clanwarlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.HASH} <#${item.clanwarlog as string}>`
					: '',
				(item.channels as any[]).filter((ch: any) => this.client.channels.cache.has(ch.channel))
					.map(((ch: any) => `${EMOJIS.HASH} \`${(this.client.channels.cache.get(ch.channel)! as TextChannel).name}\``))
					.join('\n')
			];
			return [
				`**[${item.name as string} (${item.tag as string})](${this.openInGame(item.tag)})**`,
				`${logs[0].length ? `**DonationLog**\n${logs[0]}` : ''}`,
				`${logs[1].length ? `**PlayerLog**\n${logs[1]}` : ''}`,
				`${logs[2].length ? `**Last-Online Board**\n${logs[2]}` : ''}`,
				`${logs[3].length ? `**Clan Embed**\n${logs[3]}` : ''}`,
				`${logs[4].length ? `**Clan Games Board**\n${logs[4]}` : ''}`,
				`${logs[5].length ? `**Clan War Feed**\n${logs[5]}` : ''}`,
				`${logs[6].length ? `**Linked Channels**\n${logs[6]}` : ''}`
			].filter(item => item.length).join('\n');
		}).join('\n\n');
	}

	private openInGame(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private paginate(items: any[], page = 1, pageLength = 2) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}
}
