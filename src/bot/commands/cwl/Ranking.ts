import { Clan, ClanWar, ClanWarClan, ClanWarOpponent, ClanWarLeague } from 'clashofclans.js';
import { EMOJIS, RED_EMOJI } from '../../util/Emojis';
import { MessageEmbed, Message } from 'discord.js';
import { Command } from 'discord-akairo';

export default class CWLRankingComamnd extends Command {
	public constructor() {
		super('cwl-ranking', {
			aliases: ['cwl-ranking', 'cwl-rank'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows clan ranking.',
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
		if (body.status === 504) {
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
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [stars, destruction, padding] = [0, 0, 5];

		const ranking: { [key: string]: any } = {};
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if (data.state === 'inWar') {
					const clan = ranking[data.clan.tag]
						? ranking[data.clan.tag]
						: ranking[data.clan.tag] = {
							name: data.clan.name,
							tag: data.clan.tag,
							stars: 0,
							destruction: 0
						};
					clan.stars += data.clan.stars;

					clan.destruction += data.clan.destructionPercentage * data.teamSize;

					const opponent = ranking[data.opponent.tag]
						? ranking[data.opponent.tag]
						: ranking[data.opponent.tag] = {
							name: data.opponent.name,
							tag: data.opponent.tag,
							stars: 0,
							destruction: 0
						};
					opponent.stars += data.opponent.stars;

					opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
				}

				if (data.state === 'warEnded') {
					const clan = ranking[data.clan.tag]
						? ranking[data.clan.tag]
						: ranking[data.clan.tag] = {
							name: data.clan.name,
							tag: data.clan.tag,
							stars: 0,
							destruction: 0
						};
					clan.stars += this.winner(data.clan, data.opponent)
						? data.clan.stars + 10
						: data.clan.stars;

					clan.destruction += data.clan.destructionPercentage * data.teamSize;

					const opponent = ranking[data.opponent.tag]
						? ranking[data.opponent.tag]
						: ranking[data.opponent.tag] = {
							tag: data.opponent.tag,
							name: data.opponent.name,
							stars: 0,
							destruction: 0
						};
					opponent.stars += this.winner(data.opponent, data.clan)
						? data.opponent.stars + 10
						: data.opponent.stars;

					opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
				}

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					if (data.state === 'warEnded') {
						stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
					}
					if (data.state === 'inWar') {
						stars += clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
					}

					if (destruction > 9999) padding = 6;
				}
			}
		}

		const ranks = Object.values(ranking);
		const rank = ranks.sort((a, b) => b.stars - a.stars).findIndex(a => a.tag === clanTag);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} ${clan.tag}`, clan.badgeUrls.small)
			.setTitle('CWL Ranking')
			.setDescription([
				`${EMOJIS.CHANNEL} **\`\u200eSTAR DEST${''.padEnd(padding - 2, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
				ranks.sort((a, b) => b.stars - a.stars)
					.map((clan, i) => `${RED_EMOJI[++i]} \`\u200e${clan.stars.toString().padEnd(3, ' ') as string}  ${this.destruction(clan.destruction, padding)}  ${clan.name.padEnd(15, ' ') as string}\``)
					.join('\n')
			])
			.setFooter(`Rank ${rank + 1}, ${stars} Stars, ${destruction.toFixed()}% Destruction`);
		return message.util!.send({ embed });
	}

	private destruction(dest: number, padding: number) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(padding, ' ');
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
