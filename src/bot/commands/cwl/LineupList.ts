import { Clan, ClanWar, ClanWarLeague } from 'clashofclans.js';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

export default class CWLLineupComamnd extends Command {
	public constructor() {
		super('cwl-lineup-list', {
			category: 'cwl_',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: [
					'Shows lineup of the current round.'
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
			return message.util!.send('**504 Request Timeout!**');
		}

		if (!body.ok) {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, this.clanURL(data.tag))
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));

		let i = 0;
		const chunks = [];
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					chunks.push({ state: data.state, round: ++i, clan, opponent });
				}
			}
		}

		if (!chunks.length) return message.util!.send('**504 Request Timeout!**');

		const data = chunks.length === 7
			? chunks.find(c => c.state === 'preparation') ?? chunks.slice(-1)[0]
			: chunks.slice(-2).reverse()[0];

		const embeds = [
			new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(
					`${data.clan.name} (${data.clan.tag})`,
					data.clan.badgeUrls.medium,
					this.clanURL(data.clan.tag)
				)
				.setDescription(
					data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition)
						.map((m, i) => `\`\u200e${this.pad(i + 1)}\`  [${m.name}](https://open.clashperk.com/${m.tag.replace('#', '')}) `)
				)
				.setFooter(`Round #${data.round}`),

			new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(
					`${data.opponent.name} (${data.opponent.tag})`,
					data.opponent.badgeUrls.medium,
					this.clanURL(data.opponent.tag)
				)
				.setDescription(
					data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition)
						.map((m, i) => `\`\u200e${this.pad(i + 1)}\`  [${m.name}](https://open.clashperk.com/${m.tag.replace('#', '')}) `)
				)
				.setFooter(`Round #${data.round}`)
		];

		await message.util!.send(`**${data.clan.name}** vs **${data.opponent.name}**`, embeds);
		if (!message.hasOwnProperty('token')) return message.channel.send({ embed: embeds[1] });
	}

	private pad(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}
}
