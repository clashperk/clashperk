import { EmbedBuilder, Message, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class ClansCommand extends Command {
	public constructor() {
		super('clans', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: "You can't use this anyway, so why explain?"
			}
		});
	}

	private async getGuild(message: Message, id: string) {
		const guilds = await this.client.shard!.broadcastEval(
			(client, id) => {
				const guild = client.guilds.cache.get(id);
				if (guild) {
					return {
						id: guild.id,
						name: guild.name,
						iconURL: guild.iconURL(),
						memberCount: guild.memberCount
					};
				}
				return null;
			},
			{ context: id }
		);
		const guild = guilds.find((guild) => guild !== null);
		if (!guild) return message.guild!;
		return guild;
	}

	public async run(message: Message, { id, page = 1 }: { id: string; page: number }) {
		const guild = id ? await this.getGuild(message, id) : message.guild!;

		const premium = this.client.patrons.get(guild.id);
		const clans = await this.client.storage.find(guild.id);
		const data = await Promise.all(
			clans.map(async (doc) => {
				const donationlog = await this.client.db.collection(Collections.DONATION_LOGS).findOne({ clanId: doc._id });
				const playerlog = await this.client.db.collection(Collections.CLAN_FEED_LOGS).findOne({ clanId: doc._id });
				const onlinelog = await this.client.db.collection(Collections.LAST_SEEN_LOGS).findOne({ clanId: doc._id });
				const clanembed = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clanId: doc._id });
				const clangames = await this.client.db.collection(Collections.CLAN_GAMES_LOGS).findOne({ clanId: doc._id });
				const clanwar = await this.client.db.collection(Collections.CLAN_WAR_LOGS).findOne({ clanId: doc._id });

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
			})
		);

		const icon = typeof guild.iconURL === 'function' ? guild.iconURL()! : guild.iconURL;
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(message))
			.setAuthor({ name: guild.name, iconURL: icon as string })
			.setTitle(`Members: ${guild.memberCount as number}`);
		if (!data.length) {
			embed.setDescription(`${message.guild!.name} doesn't have any clans. Why not add some?`);
			return message.channel.send({ embeds: [embed] });
		}

		const paginated = this.paginate(data, page);

		embed.setDescription([`${premium ? '**Patron** \nYes' : ''}`, '', this.desc(paginated)].join('\n'));
		embed.setFooter({ text: `Page ${paginated.page}/${paginated.maxPage} (${data.length} ${data.length === 1 ? 'clan' : 'clans'})` });

		if (clans.length <= 2) {
			return message.channel.send({ embeds: [embed] });
		}

		const customIds = {
			next: this.client.uuid(message.author.id),
			prev: this.client.uuid(message.author.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setCustomId(customIds.prev))
			.addComponents(new ButtonBuilder().setEmoji('➡️').setStyle(ButtonStyle.Secondary).setCustomId(customIds.next));

		const msg = await message.channel.send({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.next) {
				page += 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await action.update({
					embeds: [
						embed
							.setFooter({
								text: `Page ${this.paginate(data, page).page}/${paginated.maxPage} (${data.length} ${
									data.length === 1 ? 'clan' : 'clans'
								})`
							})
							.setDescription(
								[`${premium ? `**Patron** \nYes ${EMOJIS.AUTHORIZE}` : ''}`, '', this.desc(this.paginate(data, page))].join(
									'\n'
								)
							)
					]
				});
			}

			if (action.customId === customIds.prev) {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await action.update({
					embeds: [
						embed
							.setFooter({
								text: `Page ${this.paginate(data, page).page}/${paginated.maxPage} (${data.length} ${
									data.length === 1 ? 'clan' : 'clans'
								})`
							})
							.setDescription(
								[`${premium ? `**Patron** \nYes ${EMOJIS.AUTHORIZE}` : ''}`, '', this.desc(this.paginate(data, page))].join(
									'\n'
								)
							)
					]
				});
			}
		});

		collector.on('end', () => {
			this.client.components.delete(customIds.prev);
			this.client.components.delete(customIds.next);
		});
	}

	private desc(paginated: any) {
		return paginated.items
			.map((item: any) => {
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
					(item.channels as any[])
						.filter((ch: any) => this.client.channels.cache.has(ch.channel))
						.map((ch: any) => `${EMOJIS.HASH} \`${(this.client.channels.cache.get(ch.channel)! as TextChannel).name}\``)
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
				]
					.filter((item) => item.length)
					.join('\n');
			})
			.join('\n\n');
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
			page,
			maxPage,
			pageLength
		};
	}

	private async delay(ms: number) {
		return new Promise((res) => setTimeout(res, ms));
	}
}
