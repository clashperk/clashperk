import { APIClanWar, APIClanWarMember, APIWarClan } from 'clashofclans.js';
import {
	APIMessage,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Collection,
	EmbedBuilder,
	PermissionsString,
	WebhookClient,
	escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS, WAR_STARS } from '../util/Emojis.js';
import { Util } from '../util/index.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

const states: { [key: string]: number } = {
	preparation: 16745216,
	inWar: 16345172
};

const results: { [key: string]: number } = {
	won: 3066993,
	lost: 15158332,
	tied: 5861569
};

export default class ClanWarLog extends BaseLog {
	public declare cached: Collection<string, Cache>;

	public constructor(private handler: RPCHandler) {
		super(handler.client);
		this.client = handler.client;
	}

	public override get collection() {
		return this.client.db.collection(Collections.CLAN_WAR_LOGS);
	}

	public override get permissions(): PermissionsString[] {
		return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		if (data.warTag && cache.rounds[data.round]?.warTag === data.warTag) {
			return this._handleMessage(cache, webhook, cache.rounds[data.round]?.message ?? null, data);
		} else if (data.warTag) {
			return this._handleMessage(cache, webhook, null, data);
		}

		if (data.uid === cache.uid) {
			return this._handleMessage(cache, webhook, cache.message ?? null, data);
		}

		return this._handleMessage(cache, webhook, null, data);
	}

	private async _handleMessage(cache: Cache, webhook: WebhookClient, message: string | null, data: Feed) {
		if (!data.warTag && data.remaining.length && data.state === 'warEnded') {
			const embed = this.getRemaining(data);
			try {
				if (embed) await webhook.send({ embeds: [embed], threadId: cache.threadId });
			} catch (error) {
				this.client.logger.warn(error, { label: 'WAR_REMAINING_MESSAGE' });
			}
		}

		if (!message) {
			const msg = await this.send(cache, webhook, data);
			return this.mutate(cache, data, msg);
		}

		const msg = await this.edit(cache, webhook, message, data);
		return this.mutate(cache, data, msg);
	}

	private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = this.embed(data);
		const row = this.getActionRow(data);

		try {
			return await super._send(cache, webhook, {
				embeds: [embed],
				components: data.state === 'preparation' ? [] : [row],
				threadId: cache.threadId
			});
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'ClanWarLog' });
			return null;
		}
	}

	private getActionRow(data: Feed) {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel('Attacks')
				.setEmoji(EMOJIS.SWORD)
				.setStyle(ButtonStyle.Primary)
				.setCustomId(JSON.stringify({ cmd: 'war', war_id: data.id, tag: data.clan.tag, attacks: true })),
			new ButtonBuilder()
				.setLabel('Defenses')
				.setEmoji(EMOJIS.SHIELD)
				.setStyle(ButtonStyle.Danger)
				.setCustomId(JSON.stringify({ cmd: 'war', war_id: data.id, tag: data.opponent.tag, attacks: true }))
		);

		if (data.state !== 'warEnded') {
			row.addComponents(
				new ButtonBuilder()
					.setLabel('Open Bases')
					.setEmoji(EMOJIS.EMPTY_STAR)
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(JSON.stringify({ cmd: 'war', war_id: data.id, tag: data.clan.tag, openBases: true }))
			);
		}

		return row;
	}

	private async edit(cache: Cache, webhook: WebhookClient, message: string, data: Feed) {
		const embed = this.embed(data);
		const row = this.getActionRow(data);

		try {
			return await webhook.editMessage(message, {
				embeds: [embed],
				components: data.state === 'preparation' ? [] : [row],
				threadId: cache.threadId
			});
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'ClanWarLog' });
			if (error.code === 10008) {
				delete cache.message;
				return this.send(cache, webhook, data);
			}
			// Unknown Webhook / Unknown Channel
			if ([10015, 10003].includes(error.code)) {
				await this.deleteWebhook(cache);
			}
			return null;
		}
	}

	private async mutate(cache: Cache, data: Feed, message: APIMessage | null) {
		if (!message) {
			if (cache.message) delete cache.message;
			if (data.warTag) cache.rounds[data.round] = { warTag: data.warTag, message: null, round: data.round };
			return this.collection.updateOne({ clanId: new ObjectId(cache.clanId) }, { $set: { uid: data.uid }, $inc: { failed: 1 } });
		}

		if (data.warTag) {
			cache.rounds[data.round] = { warTag: data.warTag, message: message.id, round: data.round };

			return this.collection.updateOne(
				{ clanId: new ObjectId(cache.clanId) },
				{
					$set: {
						updatedAt: new Date(),
						failed: 0,
						[`rounds.${data.round}`]: { warTag: data.warTag, message: message.id, round: data.round }
					}
				}
			);
		}

		cache.uid = data.uid;
		cache.message = message.id;
		return this.collection.updateOne(
			{ clanId: new ObjectId(cache.clanId) },
			{ $set: { message: message.id, uid: data.uid, updatedAt: new Date(), failed: 0 } }
		);
	}

	private embed(data: Feed) {
		if (data.warTag) return this.getLeagueWarEmbed(data);
		return this.getRegularWarEmbed(data);
	}

	private getRegularWarEmbed(data: Feed) {
		const embed = new EmbedBuilder()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(data.clan.badgeUrls.small);
		if (data.state === 'preparation') {
			const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
			embed
				.setColor(states[data.state])
				.setDescription(
					[
						'**War Against**',
						`**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
						'',
						'**War State**',
						'Preparation Day',
						`War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
						'',
						'**War Size**',
						`${data.teamSize} vs ${data.teamSize}`
					].join('\n')
				);
			embed.setTimestamp();
		}

		if (data.state === 'inWar') {
			const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
			embed
				.setColor(states[data.state])
				.setDescription(
					[
						'**War Against**',
						`**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
						'',
						'**War State**',
						'Battle Day',
						`End Time: ${Util.getRelativeTime(endTimestamp)}`,
						'',
						'**War Size**',
						`${data.teamSize} vs ${data.teamSize}`,
						'',
						'**War Stats**',
						`${this.getLeaderBoard(data.clan, data.opponent)}`
					].join('\n')
				);

			if (data.recent?.length) {
				const max = Math.max(...data.recent.map((atk) => atk.attacker.destructionPercentage));
				const pad = max === 100 ? 4 : 3;
				embed.addFields([
					{
						name: 'Recent Attacks',
						value: [
							...data.recent.map(({ attacker, defender }) => {
								const name = escapeMarkdown(attacker.name);
								const stars = this.getStars(attacker.oldStars, attacker.stars);
								const destruction: string = Math.floor(attacker.destructionPercentage)
									.toString()
									.concat('%')
									.padStart(pad, ' ');
								return `${stars} \`\u200e${destruction}\` ${BLUE_NUMBERS[attacker.mapPosition]!}${ORANGE_NUMBERS[
									attacker.townHallLevel
								]!}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]!}${ORANGE_NUMBERS[defender.townHallLevel]!} ${name}`;
							})
						].join('\n')
					}
				]);
			}
			embed.setTimestamp();
		}

		if (data.state === 'warEnded') {
			embed
				.setColor(results[data.result])
				.setDescription(
					[
						'**War Against**',
						`**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
						'',
						'**War State**',
						'War Ended',
						'',
						'**War Size**',
						`${data.teamSize} vs ${data.teamSize}`,
						'',
						'**War Stats**',
						`${this.getLeaderBoard(data.clan, data.opponent)}`
					].join('\n')
				);
			embed.setFooter({ text: 'Ended' }).setTimestamp();
		}

		embed.setDescription(
			[
				embed.data.description,
				'',
				'**Rosters**',
				`${escapeMarkdown(data.clan.name)}`,
				`${this.getRoster(data.clan.rosters)}`,
				'',
				`${escapeMarkdown(data.opponent.name)}`,
				`${this.getRoster(data.opponent.rosters)}`
			].join('\n')
		);

		return embed;
	}

	private getRemaining(data: Feed) {
		const embed = new EmbedBuilder()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setThumbnail(data.clan.badgeUrls.small)
			.setURL(this.clanURL(data.clan.tag))
			.setDescription(
				[
					'**War Against**',
					`**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`
				].join('\n')
			);
		const twoRem = data.remaining
			.filter((m) => !m.attacks)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]!} ${escapeMarkdown(m.name)}`);
		const oneRem = data.remaining
			.filter((m) => m.attacks?.length === 1)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]!} ${escapeMarkdown(m.name)}`);

		const friendly = data.attacksPerMember === 1;
		if (twoRem.length) {
			const chunks = Util.splitMessage(twoRem.join('\n'), { maxLength: 1000 });
			embed.addFields(chunks.map((chunk, i) => ({ name: i === 0 ? `${friendly ? 1 : 2} Missed Attacks` : '\u200b', value: chunk })));
		}

		if (oneRem.length && !friendly) {
			const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
			embed.addFields(chunks.map((chunk, i) => ({ name: i === 0 ? '1 Missed Attacks' : '\u200b', value: chunk })));
		}

		if ((oneRem.length && !friendly) || twoRem.length) return embed;
		return null;
	}

	private getLeagueWarEmbed(data: Feed) {
		const { clan, opponent } = data;
		const embed = new EmbedBuilder()
			.setTitle(`\u200e${clan.name} (${clan.tag})`)
			.setURL(this.clanURL(clan.tag))
			.setThumbnail(clan.badgeUrls.small)
			.addFields([
				{
					name: 'War Against',
					value: `\u200e[${escapeMarkdown(opponent.name)} (${opponent.tag})](${this.clanURL(opponent.tag)})`
				},
				{
					name: 'Team Size',
					value: `${data.teamSize}`
				}
			]);

		if (data.state === 'inWar') {
			const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addFields([
				{ name: 'War State', value: ['Battle Day', `End Time: ${Util.getRelativeTime(endTimestamp)}`].join('\n') },
				{ name: 'War Stats', value: this.getLeaderBoard(clan, opponent) }
			]);
		}

		if (data.state === 'preparation') {
			const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addFields([
				{
					name: 'War State',
					value: ['Preparation Day', `War Start Time: ${Util.getRelativeTime(startTimestamp)}`].join('\n')
				}
			]);
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result]);
			embed.addFields([
				{
					name: 'War State',
					value: 'War Ended'
				},
				{
					name: 'War Stats',
					value: this.getLeaderBoard(clan, opponent)
				}
			]);
		}

		const rosters = [
			`\u200e${clan.name}`,
			`${this.getRoster(clan.rosters)}`,
			'',
			`\u200e${opponent.name}`,
			`${this.getRoster(opponent.rosters)}`
		];

		if (rosters.join('\n').length > 1024) {
			embed.addFields([
				{ name: 'Rosters', value: rosters.slice(0, 2).join('\n') },
				{ name: '\u200e', value: rosters.slice(-2).join('\n') }
			]);
		} else {
			embed.addFields([{ name: 'Rosters', value: rosters.join('\n') }]);
		}

		if (data.recent?.length) {
			const max = Math.max(...data.recent.map((atk) => atk.attacker.destructionPercentage));
			const pad = max === 100 ? 4 : 3;
			embed.addFields([
				{
					name: 'Recent Attacks',
					value: [
						...data.recent.map(({ attacker, defender }) => {
							const name = escapeMarkdown(attacker.name);
							const stars = this.getStars(attacker.oldStars, attacker.stars);
							const destruction: string = Math.floor(attacker.destructionPercentage)
								.toString()
								.concat('%')
								.padStart(pad, ' ');
							return `${stars} \`\u200e${destruction}\` ${BLUE_NUMBERS[attacker.mapPosition]!}${ORANGE_NUMBERS[
								attacker.townHallLevel
							]!}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]!}${ORANGE_NUMBERS[defender.townHallLevel]!} ${name}`;
						})
					].join('\n')
				}
			]);
		}

		if (data.remaining.length) {
			const oneRem = data.remaining
				.sort((a, b) => a.mapPosition - b.mapPosition)
				.map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]!} ${m.name}`);

			if (oneRem.length) {
				const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
				embed.addFields(chunks.map((chunk, i) => ({ name: i === 0 ? 'Missed Attacks' : '\u200e', value: chunk })));
			}
		}

		embed.setFooter({ text: `Round #${data.round}` }).setTimestamp();
		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private getLeaderBoard(clan: APIWarClan, opponent: APIWarClan) {
		return [
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars
				.toString()
				.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.SWORD} \u2002 \`\u200e ${opponent.attacks
				.toString()
				.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
				EMOJIS.FIRE
			} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
		].join('\n');
	}

	private getStars(oldStars: number, newStars: number) {
		if (oldStars > newStars) {
			return [WAR_STARS.OLD.repeat(newStars), WAR_STARS.EMPTY.repeat(3 - newStars)].filter((stars) => stars.length).join('');
		}
		return [WAR_STARS.OLD.repeat(oldStars), WAR_STARS.NEW.repeat(newStars - oldStars), WAR_STARS.EMPTY.repeat(3 - newStars)]
			.filter((stars) => stars.length)
			.join('');
	}

	private getRoster(townHalls: Roster[]) {
		return this.chunk(townHalls)
			.map((chunks) => {
				const list = chunks.map((th) => `${TOWN_HALLS[th.level]!} ${ORANGE_NUMBERS[th.total]!}`);
				return list.join(' ');
			})
			.join('\n');
	}

	private chunk(items: Roster[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	public async init() {
		for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
			this.cached.set((data.clanId as ObjectId).toHexString(), {
				tag: data.tag,
				clanId: data.clanId,
				guild: data.guild,
				uid: data.uid,
				channel: data.channel,
				rounds: data.rounds || {},
				message: data.message,
				webhook: data.webhook ? new WebhookClient(data.webhook) : null
			});
		}
	}

	public async add(id: string) {
		const data = await this.collection.findOne({ clanId: new ObjectId(id) });
		if (!data) return null;

		this.cached.set(id, {
			tag: data.tag,
			clanId: data.clanId,
			guild: data.guild,
			uid: data.uid,
			channel: data.channel,
			rounds: data.rounds || {},
			message: data.message,
			webhook: data.webhook ? new WebhookClient(data.webhook) : null
		});
	}
}

interface Roster {
	total: number;
	level: number;
}

interface Attacker {
	name: string;
	stars: number;
	oldStars: number;
	mapPosition: number;
	townHallLevel: number;
	destructionPercentage: number;
}

interface Defender {
	mapPosition: number;
	townHallLevel: number;
}

interface Recent {
	attacker: Attacker;
	defender: Defender;
}

interface Feed extends APIClanWar {
	recent?: Recent[];
	result: string;
	round: number;
	uid: string;
	id: number;
	warTag?: string;
	attacksPerMember: number;
	remaining: APIClanWarMember[];
	clan: APIWarClan & { rosters: Roster[] };
	opponent: APIWarClan & { rosters: Roster[] };
}

interface Cache {
	guild: string;
	clanId: ObjectId;
	threadId?: string;
	channel: string;
	tag: string;
	rounds: any;
	uid: string;
	message?: string;
	webhook: WebhookClient | null;
}
