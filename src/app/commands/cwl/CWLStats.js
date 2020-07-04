const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');

class CWLStatsComamnd extends Command {
	constructor() {
		super('cwl-stats', {
			aliases: ['cwl-stats'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows some statistics for each round.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
				}
			});
		}

		const body = await res.json();

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message));

		if (!(body.state || res.ok)) {
			embed.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, { clanTag: data.tag, clanName: data.name, clanBadge: data.badgeUrls.medium });
	}

	async rounds(message, body, { clanTag, clanName, clanBadge } = {}) {
		const collection = [];
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [index, stars, destruction] = [0, 0, 0];
		const ranking = body.clans.map(clan => ({ tag: clan.tag, stars: 0 }));
		const members = body.clans.find(clan => clan.tag === clanTag)
			.members.map(member => ({ name: member.name, tag: member.tag, stars: 0, attacks: 0, of: 0, dest: 0 }));

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();
				this.ranking(data, ranking);

				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					if (data.state === 'warEnded') {
						stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
						const end = new Date(moment(data.endTime).toDate()).getTime();
						for (const member of clan.members) {
							members.find(m => m.tag === member.tag)
								.of += 1;
							if (member.attacks) {
								members.find(m => m.tag === member.tag)
									.attacks += 1;

								members.find(m => m.tag === member.tag)
									.stars += member.attacks[0].stars;

								members.find(m => m.tag === member.tag)
									.dest += member.attacks[0].destructionPercentage;
							}
						}

						collection.push([[
							`${this.winner(clan, opponent) ? emoji.ok : emoji.wrong} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Ended ${moment.duration(Date.now() - end).format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						], [
							`\`\u200e${clan.stars.toString().padEnd(15, ' ')} \u200f\`\u200e \u2002 ${emoji.stars} \u2002 \`\u200e ${opponent.stars.toString().padStart(15, ' ')}\u200f\``,
							`\`\u200e${this.attacks(clan.attacks, data.teamSize).padEnd(15, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${this.attacks(opponent.attacks, data.teamSize).padStart(15, ' ')}\u200f\``,
							`\`\u200e${this.destruction(clan.destructionPercentage).padEnd(15, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${this.destruction(opponent.destructionPercentage).padStart(15, ' ')}\u200f\``
						]]);
					}
					if (data.state === 'inWar') {
						stars += clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
						const started = new Date(moment(data.startTime).toDate()).getTime();
						for (const member of clan.members) {
							members.find(m => m.tag === member.tag)
								.of += 1;
							if (member.attacks) {
								members.find(m => m.tag === member.tag)
									.attacks += 1;

								members.find(m => m.tag === member.tag)
									.stars += member.attacks[0].stars;

								members.find(m => m.tag === member.tag)
									.dest += member.attacks[0].destructionPercentage;
							}
						}

						collection.push([[
							`${emoji.loading} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Started ${moment.duration(Date.now() - started).format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						], [
							`\`\u200e${clan.stars.toString().padEnd(15, ' ')} \u200f\`\u200e \u2002 ${emoji.stars} \u2002 \`\u200e ${opponent.stars.toString().padStart(15, ' ')}\u200f\``,
							`\`\u200e${this.attacks(clan.attacks, data.teamSize).padEnd(15, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${this.attacks(opponent.attacks, data.teamSize).padStart(15, ' ')}\u200f\``,
							`\`\u200e${this.destruction(clan.destructionPercentage).padEnd(15, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${this.destruction(opponent.destructionPercentage).padStart(15, ' ')}\u200f\``
						]]);
					}
				}
			}
		}

		const description = collection.map(arr => {
			const header = arr[0].join('\n');
			const description = arr[1].join('\n');
			return [header, description].join('\n');
		}).join('\n\n');
		const rank = ranking.sort((a, b) => b.stars - a.stars).findIndex(a => a.tag === clanTag);
		const leaderboard = members.sort((a, b) => b.stars - a.stars);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clanName} CWL`, clanBadge)
			.setDescription(description)
			.setFooter(`Rank ${rank + 1}, ${stars} Stars, ${destruction.toFixed()}% Destruction`);
		const msg = await message.util.send({ embed });
		await msg.react('➕');
		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '➕' && user.id === message.author.id,
			{ max: 1, time: 30000, errors: ['time'] }
		).catch(() => null);
		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;
		return message.channel.send({
			embed: {
				color: 0x5970c1,
				author: {
					name: `${clanName} CWL`,
					icon_url: clanBadge
				},
				description: [
					`\`\`\`\u200e # STR DEST ATT ${'NAME'}`,
					leaderboard.filter(m => m.attacks !== 0)
						.map((m, i) => `\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ')} ${this.dest(m.dest).padEnd(4, ' ')} ${this.attacks(m.attacks, m.of).padEnd(3, ' ')} ${m.name.substring(0, 12)}`)
						.join('\n'),
					'```'
				].join('\n')
			}
		});
	}

	dest(dest) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(4, ' ');
	}

	destruction(dest) {
		return dest.toFixed(2).toString().concat('%');
	}

	attacks(num, team) {
		return num.toString().concat(`/${team}`);
	}

	winner(clan, opponent) {
		if (clan.stars > opponent.stars) {
			return true;
		} else if (clan.stars < opponent.stars) {
			return false;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return true;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return false;
		}
	}

	ranking(data, ranking) {
		if (data.state === 'warEnded') {
			ranking.find(({ tag }) => tag === data.clan.tag)
				.stars += this.winner(data.clan, data.opponent)
					? data.clan.stars + 10
					: data.clan.stars;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.stars += this.winner(data.opponent, data.clan)
					? data.opponent.stars + 10
					: data.opponent.stars;
		}

		if (data.state === 'inWar') {
			ranking.find(({ tag }) => tag === data.clan.tag)
				.stars += data.clan.stars;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.stars += data.opponent.stars;
		}

		return ranking;
	}
}

module.exports = CWLStatsComamnd;
