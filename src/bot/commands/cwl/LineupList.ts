import { BLUE_NUMBERS, ORANGE_NUMBERS } from '../../util/NumEmojis';
import { Clan, ClanWar, ClanWarLeague } from 'clashofclans.js';
import { MessageEmbed, Message, Util } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

export default class CWLLineupComamnd extends Command {
	public constructor() {
		super('cwl-lineup-list', {
			category: 'cwl_',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
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

		const chunks = [];
		for (const { warTags } of rounds.slice(-1)) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					chunks.push({ state: data.state, clan, opponent });
				}
			}
		}

		if (!chunks.length) return message.util!.send('**504 Request Timeout!**');
		const data = chunks.length === 7
			? chunks.find(c => c.state === 'preparation') ?? chunks.slice(-1)[0]
			: chunks.slice(-2).reverse()[0];

		const interaction = message.hasOwnProperty('token');
		const pages = Util.splitMessage([
			`**Clan War League Round #${rounds.length}**`,
			'',
			interaction
				? `**[${Util.escapeMarkdown(data.clan.name)} (${data.clan.tag})](<${this.clanURL(data.clan.tag)}>)**`
				: `**${Util.escapeMarkdown(data.clan.name)} (${data.clan.tag})**`,
			`${EMOJIS.HASH}${EMOJIS.TOWNHALL} **NAME**`,
			data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition).map(
				mem => `\u200e${BLUE_NUMBERS[mem.mapPosition]}${ORANGE_NUMBERS[mem.townhallLevel]} ${Util.escapeMarkdown(mem.name)}`
			).join('\n'),
			'',
			interaction
				? `**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](<${this.clanURL(data.opponent.tag)}>)**`
				: `**${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})**`,
			`${EMOJIS.HASH}${EMOJIS.TOWNHALL} **NAME**`,
			data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition).map(
				mem => `\u200e${BLUE_NUMBERS[mem.mapPosition]}${ORANGE_NUMBERS[mem.townhallLevel]} ${Util.escapeMarkdown(mem.name)}`
			).join('\n')
		]);

		if (interaction) await message.util!.send(pages[0]);
		if (pages.length === 1 && interaction) return;
		return message.channel.send(pages.slice(interaction ? 1 : 0), { split: true });
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}
}
