import { Clan, ClanWar, ClanWarLeague } from 'clashofclans.js';
import { CYAN_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

export default class CWLMissedComamnd extends Command {
	public constructor() {
		super('cwl-missed', {
			aliases: ['cwl-missed'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES'],
			description: {
				content: [
					'Shows missed attacks of all rounds.'
				],
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
				.setAuthor(
					`${data.name} (${data.tag})`,
					`${data.badgeUrls.medium}`,
					`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`
				)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		this.client.storage.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const clanTag = clan.tag;
		let round = 0;
		const object: { [key: string]: any } = {};
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (data.state === 'warEnded') {
						for (const member of clan.members) {
							if (member.attacks && member.attacks.length === 1) continue;
							object[member.tag] = {
								count: Number((object[member.tag] || { count: 0 }).count) + 1,
								name: member.name
							};
						}
						round += 1;
					}
					break;
				}
			}
		}

		const collection = Object.values(object);
		if (rounds.length < 3 && !collection.length) {
			return message.util!.send('This command is available after the end of a round.');
		}

		if (!collection.length) {
			return message.util!.send('Hmm! Looks like everyone attacked.');
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setTitle('Missed Attacks')
			.setDescription(
				collection.sort((a, b) => b.count - a.count)
					.map(m => `\u200e${CYAN_NUMBERS[m.count]} ${m.name as string}`)
			)
			.setFooter(`Upto Round #${round}`);

		return message.util!.send({ embed });
	}
}
