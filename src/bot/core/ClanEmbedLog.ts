import { Clan } from 'clashofclans.js';
import { Collection, EmbedBuilder, PermissionsString, Snowflake, WebhookClient } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Client } from '../struct/Client.js';
import { Collections } from '../util/Constants.js';
import { CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from '../util/Emojis.js';
import BaseLog from './BaseLog.js';

export interface Cache {
	clanId: ObjectId;
	tag: string;
	guild: string;
	channel: Snowflake;
	message?: Snowflake;
	color: number;
	embed: any;
	threadId?: string;
	webhook: WebhookClient | null;
}

interface Feed {
	clan: Clan;
}

export default class ClanEmbedLog extends BaseLog {
	public declare cached: Collection<string, Cache>;

	public override get collection() {
		return this.client.db.collection(Collections.CLAN_EMBED_LOGS);
	}

	public override get permissions(): PermissionsString[] {
		return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'AddReactions', 'ViewChannel'];
	}

	public constructor(client: Client) {
		super(client);
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		if (!cache.message) {
			const msg = await this.send(cache, webhook, data);
			return this.updateMessageId(cache, msg);
		}

		const msg = await this.edit(cache, webhook, data);
		return this.updateMessageId(cache, msg);
	}

	private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = await this.embed(cache, data.clan);
		try {
			return await super._send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async edit(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = await this.embed(cache, data.clan);
		try {
			return await super._edit(cache, webhook, { embeds: [embed], threadId: cache.threadId });
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async embed(cache: Cache, data: Clan) {
		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map((arr) => ({ level: Number(arr[0]), total: arr[1] }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const clanDescription: string = cache.embed.description === 'auto' ? data.description : cache.embed.description;
		const clanRequirements: string =
			cache.embed.accepts === 'auto'
				? data.requiredTownhallLevel
					? `TH ${data.requiredTownhallLevel}+`
					: 'Any'
				: cache.embed.accepts;

		const capitalHall = data.clanCapital?.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${data.clanCapital.capitalHallLevel}**` : '';

		const embed = new EmbedBuilder()
			.setColor(cache.color)
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription(
				[
					`${EMOJIS.CLAN} **${data.clanLevel}**${capitalHall} ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
					'',
					clanDescription || ''
				].join('\n')
			)
			.addFields([
				{
					name: 'Clan Leader',
					value: [
						`${EMOJIS.OWNER} <@!${cache.embed.userId as string}> (${
							data.memberList.find((m) => m.role === 'leader')?.name ?? 'None'
						})`
					].join('\n')
				},
				{
					name: 'Requirements',
					value: [
						`${EMOJIS.TOWNHALL} ${clanRequirements || 'Any'}`,
						'**Trophies Required**',
						`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
						`**Location** \n${location}`
					].join('\n')
				},
				{
					name: 'War Performance',
					value: [
						`${EMOJIS.OK} ${data.warWins} Won ${
							data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''
						}`,
						'**War Frequency & Streak**',
						`${
							data.warFrequency.toLowerCase() === 'morethanonceperweek'
								? '🎟️ More Than Once Per Week'
								: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`
						} ${'🏅'} ${data.warWinStreak}`,
						'**War League**',
						`${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
					].join('\n')
				},
				{
					name: `Town Halls (Avg. ${avg.toFixed(2)})`,
					value: [
						townHalls
							.slice(0, 7)
							.map((th) => `${TOWN_HALLS[th.level]!} ${ORANGE_NUMBERS[th.total]!}\u200b`)
							.join(' ') || `${EMOJIS.WRONG} None`
					].join('\n')
				}
			])
			.setTimestamp()
			.setFooter({ text: 'Synced' });

		return embed;
	}

	public async init() {
		await this.client.db
			.collection(Collections.CLAN_EMBED_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })
			.forEach((data) => {
				this.cached.set((data.clanId as ObjectId).toHexString(), {
					clanId: data.clanId,
					message: data.message,
					guild: data.guild,
					color: data.color,
					embed: data.embed,
					tag: data.tag,
					channel: data.channel,
					webhook: data.webhook ? new WebhookClient(data.webhook) : null
				});
			});
	}

	public async add(_id: string) {
		const data = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clanId: new ObjectId(_id) });

		if (!data) return null;
		return this.cached.set(_id, {
			clanId: data.clanId,
			channel: data.channel,
			guild: data.guild,
			message: data.message,
			color: data.color,
			embed: data.embed,
			tag: data.tag,
			webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
		});
	}
}
