const { townHallEmoji, emoji, RED_EMOJI, BLUE_EMOJI } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed, Util, Collection } = require('discord.js');
const { ObjectId } = require('mongodb');
const moment = require('moment');

const states = {
	preparation: 16745216,
	inWar: 16345172
};

const results = {
	won: 3066993,
	lost: 15158332,
	tied: 5861569
};

class ClanWarEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Collection();
	}

	async exec(tag, data) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, data);
		}

		return clans.clear();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	permissionsFor(id, cache, data) {
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				return this.getWarType(id, channel, data);
			}
		}
	}

	async getWarType(id, channel, data) {
		const cache = this.cached.get(id);
		if (data.groupWar && cache?.rounds[data.round]?.warTag === data.warTag) {
			return this.handleMessage(id, channel, cache?.rounds[data.round]?.messageID, data);
		} else if (data.groupWar) {
			return this.handleMessage(id, channel, null, data);
		}

		if (data.warID === cache.warID) {
			return this.handleMessage(id, channel, data.messageID, data);
		}

		return this.handleMessage(id, channel, null, data);
	}

	async handleMessage(id, channel, messageID, data) {
		if (!data.groupWar && data.remaining.length && data.state === 'warEnded') {
			const embed = this.getRemaining(data);
			try {
				await channel.send({ embed });
			} catch (error) {
				this.client.logger.warn(error, { label: 'WAR_REMAINING_MESSAGE' });
			}
		}

		if (!messageID) {
			return this.sendNew(id, channel, data);
		}

		const message = await channel.messages.fetch(messageID, false)
			.catch(error => {
				this.client.logger.warn(error, { label: 'WAR_FETCH_MESSAGE' });
				if (error.code === 10008) {
					return { deleted: true };
				}

				return null;
			});

		if (!message) return;

		if (message.deleted) {
			return this.sendNew(id, channel, data);
		}

		if (!message.deleted) {
			return this.edit(id, message, data);
		}
	}

	async sendNew(id, channel, data) {
		const embed = this.embed(data);
		const message = await channel.send({ embed }).catch(() => null);
		if (message) await this.updateMessageID(id, data, message.id);
		return message;
	}

	async edit(id, message, data) {
		const embed = this.embed(data);

		return message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					return this.sendNew(id, message.channel, data);
				}
				return null;
			});
	}

	embed(data) {
		if (data.groupWar) return this.getLeagueWarEmbed(data);
		return this.getRegularWarEmbed(data);
	}

	getRegularWarEmbed(data) {
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(data.clan.badgeUrls.small);
		if (data.state === 'preparation') {
			embed.setColor(states[data.state])
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Preparation Day',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`
				]);
			embed.setTimestamp(new Date(moment(data.startTime).toDate()))
				.setFooter('Starting');
		}

		if (data.state === 'inWar') {
			embed.setColor(states[data.state])
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Battle Day',
					`Ends in ${moment.duration(new Date(moment(data.endTime).toDate()).getTime() - Date.now()).format('D[d], H[h] m[m]', { trim: 'both mid' })}`,
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**War Stats**',
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% / ${data.opponent.destructionPercentage.toFixed(2)}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setFooter('Synced').setTimestamp();
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result])
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'War Ended',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**War Stats**',
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% / ${data.opponent.destructionPercentage.toFixed(2)}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setFooter('Ended').setTimestamp(new Date(moment(data.endTime).toDate()));
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`${Util.escapeMarkdown(data.clan.name)}`,
			`${this.roster(data.clan.members)}`,
			'',
			`${Util.escapeMarkdown(data.opponent.name)}`,
			`${this.roster(data.opponent.members)}`
		]);

		return embed;
	}

	getRemaining(data) {
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setThumbnail(data.clan.badgeUrls.small)
			.setURL(this.clanURL(data.clan.tag))
			.setDescription([
				'**War Against**',
				`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`
			]);
		const twoRem = data.remaining.filter(m => !m.attacks)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`);
		const oneRem = data.remaining.filter(m => m?.attacks?.length === 1)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`);

		if (twoRem.length) {
			const chunks = Util.splitMessage(twoRem.join('\n'), { maxLength: 1000 });
			chunks.map((chunk, i) => embed.addField(i === 0 ? '2 Remaining Attacks' : '\u200e', chunk));
		}
		if (oneRem.length) {
			const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
			chunks.map((chunk, i) => embed.addField(i === 0 ? '1 Remaining Attacks' : '\u200e', chunk));
		}

		if (oneRem.length || twoRem.length) return embed;
		return null;
	}

	getLeagueWarEmbed(data) {
		const { clan, opponent } = data;
		const embed = new MessageEmbed()
			.setTitle(`\u200e${clan.name} (${clan.tag})`)
			.setURL(this.clanURL(clan.tag))
			.setThumbnail(clan.badgeUrls.small)
			.addField('War Against', `\u200e[${Util.escapeMarkdown(opponent.name)} (${opponent.tag})](${this.clanURL(opponent.tag)})`)
			.addField('Team Size', `${data.teamSize}`);

		if (data.state === 'inWar') {
			const ends = new Date(moment(data.endTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('State', ['Battle Day', `Ends in ${moment.duration(ends - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`])
				.addField('Stats', [
					`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.star} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
					`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
					`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
				]);
		}

		if (data.state === 'preparation') {
			const start = new Date(moment(data.startTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('State', ['Preparation', `Ends in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`]);
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result]);
			embed.addField('State', 'War Ended')
				.addField('Stats', [
					`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.star} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
					`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
					`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
				]);
		}

		const rosters = [
			`\u200e${clan.name}`,
			`${this.getRoster(clan.members)}`,
			'',
			`\u200e${opponent.name}`,
			`${this.getRoster(opponent.members)}`
		];

		if (rosters.join('\n').length > 1024) {
			embed.addField('Rosters', rosters.slice(0, 2));
			embed.addField('\u200e', rosters.slice(-2));
		} else {
			embed.addField('Rosters', rosters);
		}

		if (data.remaining.length) {
			const oneRem = data.remaining.filter(m => m?.attacks?.length === 1)
				.sort((a, b) => a.mapPosition - b.mapPosition)
				.map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`);

			if (oneRem.length) {
				const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
				chunks.map((chunk, i) => embed.addField(i === 0 ? '1 Remaining Attacks' : '\u200e', chunk));
			}
		}

		embed.setFooter(`Round #${data.round}`).setTimestamp();
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	getRoster(townHalls = [], codeblock = false) {
		return this.chunk(townHalls)
			.map(chunks => {
				const list = chunks.map(th => {
					const total = `\`\u200e${th.total.toString().padStart(2, ' ')}\``;
					return `${townHallEmoji[th.level]} ${codeblock ? total : RED_EMOJI[th.total]}`;
				});
				return list.join(' ');
			}).join('\n');
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	async updateMessageID(id, data, messageID) {
		if (data.groupWar) {
			const cache = this.cached.get(id);
			cache.rounds[data.round] = { warTag: data.warTag, messageID, round: data.round };
			this.cached.set(id, cache);

			return mongodb.db('clashperk').collection('clanwarlogs')
				.updateOne(
					{ clan_id: ObjectId(id) },
					{
						$set: {
							[`rounds.${data.round}`]: { warTag: data.warTag, messageID, round: data.round }
						}
					}
				);
		}

		const cache = this.cached.get(id);
		cache.warID = data.warID;
		cache.messageID = messageID;
		this.cached.set(id, cache);

		return mongodb.db('clashperk').collection('clanwarlogs')
			.updateOne(
				{ clan_id: ObjectId(id) },
				{
					$set: { messageID, warID: data.warID }
				}
			);
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.find()
			.toArray();

		const filtered = collection.filter(data => this.client.guilds.cache.get(data.guild));
		filtered.forEach(data => {
			this.cached.set(ObjectId(data.clan_id).toString(), {
				guild: data.guild,
				channel: data.channel,
				tag: data.tag,
				rounds: data.rounds || {},
				messageID: data.messageID,
				warID: data.warID
			});
		});

		return new Promise(resolve => {
			this.client.grpc.initClanWarHandler({
				data: JSON.stringify(filtered),
				shardId: this.client.shard.ids[0],
				shards: this.client.shard.count
			}, (err, res) => resolve(res.data));
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			tag: data.tag,
			rounds: data.rounds || {},
			messageID: data.messageID,
			warID: data.warID
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanWarEvent;
