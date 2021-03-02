import { Clan, ClanWarLeague, ClanWar } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class CWLGainedComamnd extends Command {
	public constructor() {
		super('cwl-gained', {
			aliases: ['cwl-gained'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows gained and lost stars of clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message) {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
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
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const clanTag = clan.tag;

		const members: { [key: string]: any } = {};

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (['inWar', 'warEnded'].includes(data.state)) {
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
					}
					break;
				}
			}
		}

		const leaderboard = Object.values(members)
			.sort((a, b) => b.stars - a.stars)
			.sort((a, b) => (b.stars - b.lost) - (a.stars - a.lost));
		if (!leaderboard.length) return message.util!.send('Nobody attacked in your clan yet, try again after sometime.');

		const embed = this.client.util.embed()
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setColor(this.client.embed(message))
			.setDescription([
				`**\`\u200e # STAR GAIN ${'NAME'.padEnd(15, ' ')}\`**`,
				leaderboard.filter(m => m.of > 0)
					.map((m, i) => {
						const gained = m.stars - m.lost >= 0 ? `+${m.stars - m.lost}` : `${m.stars - m.lost}`;
						return `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ') as string}  ${gained.padStart(3, ' ')}  ${m.name.padEnd(15, ' ') as string}\``;
					})
					.join('\n')
			]);

		return message.util!.send({ embed });
	}
}

