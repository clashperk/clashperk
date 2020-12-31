import { MessageEmbed, Message, Guild } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { EMOJIS } from '../../util/Emojis';

export default class ClansCommand extends Command {
	public constructor() {
		super('clans', {
			aliases: ['clans', 'tracking', 'info'],
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				usage: '<page>',
				examples: ['2'],
				content: 'Shows all clans related to the server.'
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
						if (!id) return null;
						if (!this.client.isOwner(msg.author.id)) return null;
						const guilds = await this.client.shard!.broadcastEval(
							`
							const guild = this.guilds.cache.get(\`${id}\`);
							if (guild) ({ id: guild.id, name: guild.name, iconURL: guild.iconURL(), memberCount: guild.memberCount });
							`
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
		await message.util!.send(`**Feching data... ${EMOJIS.LOADING}**`);

		const premium = this.client.patrons.get(guild.id);
		const clans = await this.client.storage.findAll(guild.id);
		const data = await Promise.all(clans.map(async doc => {
			const donationlog = await this.client.db.collection('donationlogs').findOne({ clan_id: doc._id });
			const playerlog = await this.client.db.collection('playerlogs').findOne({ clan_id: doc._id });
			const onlinelog = await this.client.db.collection('lastonlinelogs').findOne({ clan_id: doc._id });
			const clanembed = await this.client.db.collection('clanembedlogs').findOne({ clan_id: doc._id });
			const clangames = await this.client.db.collection('clangameslogs').findOne({ clan_id: doc._id });
			const clanwar = await this.client.db.collection('clanwarlogs').findOne({ clan_id: doc._id });

			return {
				tag: doc.tag,
				name: doc.name,
				donationlog: donationlog && doc.active && doc.flag > 0 ? donationlog.channel : null,
				playerlog: playerlog && doc.active && doc.flag > 0 ? playerlog.channel : null,
				onlinelog: onlinelog && doc.active && doc.flag > 0 ? onlinelog.channel : null,
				clanembedlog: clanembed && doc.active && doc.flag > 0 ? clanembed.channel : null,
				clangameslog: clangames && doc.active && doc.flag > 0 ? clangames.channel : null,
				clanwarlog: clanwar && doc.active && doc.flag > 0 ? clanwar.channel : null
			};
		}));

		const icon = typeof guild.iconURL === 'function' ? guild.iconURL()! : guild.iconURL;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${guild.name}`, icon as string)
			.setTitle(`Members: ${guild.memberCount}`);
		if (!data.length) {
			embed.setDescription(`${message.guild!.name} doesn't have any clans. Why not add some?`);
			return message.util!.send({ embed });
		}

		const paginated = this.paginate(data, page);

		embed.setDescription([
			`${premium ? '**Patron** \nYes' : ''}`,
			'',
			this.desc(paginated)
		]).setFooter([
			`Page ${paginated.page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`
		]);

		if (clans.length <= 2) {
			return message.util!.send({ embed });
		}

		const msg = await message.util!.send({ embed });

		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await msg.edit({
					embed: embed.setFooter(`Page ${this.paginate(data, page).page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`)
						.setDescription([
							`${premium ? `**Patron** \nYes ${EMOJIS.AUTHORIZE}` : ''}`,
							'',
							this.desc(this.paginate(data, page))
						])
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
					embed: embed.setFooter(`Page ${this.paginate(data, page).page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})`)
						.setDescription([
							`${premium ? `**Subscription** \nActive ${EMOJIS.AUTHORIZE}` : ''}`,
							'',
							this.desc(this.paginate(data, page))
						])
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
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
						? `${EMOJIS.OK} Enabled \n${EMOJIS.CHANNEL} <#${item.donationlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.CHANNEL} <#${item.donationlog as string}>`
					: '',
				item.playerlog
					? playerlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.CHANNEL} <#${item.playerlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.CHANNEL} <#${item.playerlog as string}>`
					: '',
				item.onlinelog
					? onlinelog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.CHANNEL} <#${item.onlinelog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.CHANNEL} <#${item.onlinelog as string}>`
					: '',
				item.clanembedlog
					? clanembedlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.CHANNEL} <#${item.clanembedlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.CHANNEL} <#${item.clanembedlog as string}>`
					: '',
				item.clangameslog
					? clangameslog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.CHANNEL} <#${item.clangameslog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.CHANNEL} <#${item.clangameslog as string}>`
					: '',
				item.clanwarlog
					? clanwarlog
						? `${EMOJIS.OK} Enabled \n${EMOJIS.CHANNEL} <#${item.clanwarlog as string}>`
						: `${EMOJIS.WRONG} Disabled \n${EMOJIS.CHANNEL} <#${item.clanwarlog as string}>`
					: ''
			];
			return [
				`**[${item.name as string} (${item.tag as string})](${this.openInGame(item.tag)})**`,
				`${logs[0].length ? `**DonationLog**\n${logs[0]}` : ''}`,
				`${logs[1].length ? `**PlayerLog**\n${logs[1]}` : ''}`,
				`${logs[2].length ? `**Last-Online Board**\n${logs[2]}` : ''}`,
				`${logs[3].length ? `**Clan Embed**\n${logs[3]}` : ''}`,
				`${logs[4].length ? `**Clan Games Board**\n${logs[4]}` : ''}`,
				`${logs[5].length ? `**Clan War Feed**\n${logs[5]}` : ''}`
			].filter(item => item.length).join('\n');
		}).join('\n\n');
	}

	private openInGame(tag: string) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
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
