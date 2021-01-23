import { Clan, ClanWarLeague, ClanWarLeagueWar, ClanWarClan, ClanWarOpponent } from 'clashofclans.js';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import moment from 'moment';

export default class CWLStatsComamnd extends Command {
	public constructor() {
		super('cwl-stats', {
			aliases: ['cwl-stats'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Shows some statistics for each round.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body: ClanWarLeague = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send([
				'504 Request Timeout'
			]);
		}

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(data.tag);
			if (cw) return this.rounds(message, cw, data);

			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		this.client.storage.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [index, stars, destruction] = [0, 0, 0];
		const clanTag = clan.tag;
		const collection: any[] = [];
		const members: { [key: string]: any } = {};
		const ranking: { [key: string]: any } = {};

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWarLeagueWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if (data.state === 'inWar') {
					const clan = ranking[data.clan.tag]
						? ranking[data.clan.tag]
						: ranking[data.clan.tag] = {
							tag: data.clan.tag,
							stars: 0
						};
					clan.stars += data.clan.stars;

					const opponent = ranking[data.opponent.tag]
						? ranking[data.opponent.tag]
						: ranking[data.opponent.tag] = {
							tag: data.opponent.tag,
							stars: 0
						};
					opponent.stars += data.opponent.stars;
				}

				if (data.state === 'warEnded') {
					const clan = ranking[data.clan.tag]
						? ranking[data.clan.tag]
						: ranking[data.clan.tag] = {
							tag: data.clan.tag,
							stars: 0
						};
					clan.stars += this.winner(data.clan, data.opponent)
						? data.clan.stars + 10
						: data.clan.stars;

					const opponent = ranking[data.opponent.tag]
						? ranking[data.opponent.tag]
						: ranking[data.opponent.tag] = {
							tag: data.opponent.tag,
							stars: 0
						};
					opponent.stars += this.winner(data.opponent, data.clan)
						? data.opponent.stars + 10
						: data.opponent.stars;
				}

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					if (data.state === 'warEnded') {
						stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
						const end = new Date(moment(data.endTime).toDate()).getTime();
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}

							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
							}
						}

						collection.push([[
							`${this.winner(clan, opponent) ? EMOJIS.OK : EMOJIS.WRONG} **${clan.name}** vs **${opponent.name}**`,
							`${EMOJIS.CLOCK} [Round ${++index}] Ended ${moment.duration(Date.now() - end).format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						], [
							`\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(opponent.attacks, data.teamSize).padStart(9, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(opponent.destructionPercentage).padStart(7, ' ')}\``
						]]);
					}
					if (data.state === 'inWar') {
						stars += clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
						const started = new Date(moment(data.startTime).toDate()).getTime();
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}

							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
							}
						}

						collection.push([[
							`${EMOJIS.LOADING} **${clan.name}** vs **${opponent.name}**`,
							`${EMOJIS.CLOCK} [Round ${++index}] Started ${moment.duration(Date.now() - started).format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						], [
							`\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(opponent.attacks, data.teamSize).padStart(9, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(opponent.destructionPercentage).padStart(7, ' ')}\``
						]]);
					}
				}
			}
		}

		if (!collection.length) return message.util!.send('Nobody attacked in your clan yet, try again after sometime.');

		const description = collection.map(arr => {
			const header = arr[0].join('\n');
			const description = arr[1].join('\n');
			return [header, description].join('\n');
		}).join('\n\n');

		const rank = Object.values(ranking).sort((a, b) => b.stars - a.stars).findIndex(a => a.tag === clanTag);
		const leaderboard = Object.values(members)
			.sort((a, b) => b.dest - a.dest)
			.sort((a, b) => b.stars - a.stars);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setTitle('CWL Stats')
			.setDescription(description)
			.setFooter(`Rank ${rank + 1}, ${stars} Stars, ${destruction.toFixed()}% Destruction`);

		const msg = await message.util!.send({ embed });
		await msg.react('➕');

		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '➕' && user.id === message.author.id,
			{ max: 1, time: 30000, errors: ['time'] }
		).catch(() => null);

		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;

		return message.channel.send({
			embed: {
				color: this.client.embed(message),
				title: 'CWL Stars',
				author: {
					name: `${clan.name} (${clan.tag})`,
					icon_url: clan.badgeUrls.small
				},
				description: [
					`**\`\u200e # STAR HIT  ${'NAME'.padEnd(15, ' ')}\`**`,
					leaderboard.filter(m => m.of > 0)
						.map((m, i) => `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ') as string}  ${this.attacks(m.attacks, m.of).padEnd(3, ' ')}  ${m.name.replace(/\`/g, '\\').padEnd(15, ' ') as string}\``)
						.join('\n')
				].join('\n')
			}
		});
	}

	private dest(dest: number) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(4, ' ');
	}

	private destruction(dest: number) {
		return dest.toFixed(2).toString().concat('%');
	}

	private attacks(num: number, team: number) {
		return num.toString().concat(`/${team}`);
	}

	private winner(clan: ClanWarClan, opponent: ClanWarOpponent) {
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
		return false;
	}
}
