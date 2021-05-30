import { Clan, ClanWar, ClanWarLeagueGroup, ClanWarMember, Player } from 'clashofclans.js';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { BLUE_NUMBERS } from '../../util/NumEmojis';

const states: { [key: string]: string } = {
	inWar: 'Battle Day',
	preparation: 'Preparation',
	warEnded: 'War Ended'
};

export default class CWLLineupComamnd extends Command {
	public constructor() {
		super('cwl-lineup', {
			aliases: ['cwl-lineup'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'],
			description: {
				content: [
					'Shows lineup of the current round.'
				],
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send('**504 Request Timeout!**');
		}

		if (!body.ok) {
			const embed = new MessageEmbed()
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

		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clan: Clan) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));

		const chunks: any[] = [];
		for (const { warTags } of rounds.slice(-2)) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const embed = new MessageEmbed()
						.setColor(this.client.embed(message));
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					const linups = await this.rosters(
						clan.members.sort((a, b) => a.mapPosition - b.mapPosition),
						opponent.members.sort((a, b) => a.mapPosition - b.mapPosition)
					);
					embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium);

					embed.setDescription([
						'**War Against**',
						`**[${opponent.name}](${this.clanURL(opponent.tag)})**`,
						'',
						`\u200e${EMOJIS.HASH} \u200b\u2002\`TH HERO\` \u2002 \u2002 \u2002 \`TH HERO\``,
						linups.map(
							(lineup, i) => `\u200e${BLUE_NUMBERS[i + 1]} \u200b\u2002${lineup.map(en => `\`${en.t.toString().padStart(2, ' ')} ${(en.h).toString().padStart(4, ' ')}\u200f\``).join(' \u2002vs\u2002 ')}`
						).join('\n')
					]);

					embed.setFooter(`Round #${rounds.findIndex(en => en.warTags.includes(warTag)) + 1} (${states[data.state]})`);
					chunks.push({ state: data.state, embed });
				}
			}
		}

		if (!chunks.length) return message.util!.send('**504 Request Timeout!**');
		const data = rounds.length === 7
			? chunks.find(c => c.state === 'preparation') || chunks.slice(-1)[0]
			: chunks.slice(-2).reverse()[0];

		const msg = await message.util!.send({ embed: data.embed });
		await msg.react('➕');

		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➕') {
				return this.handler.handleDirectCommand(message, clan.tag, this.handler.modules.get('cwl-lineup-list')!, false);
			}
		});

		collector.on('end', async () => msg.reactions.removeAll().catch(() => null));
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private async rosters(clanMembers: ClanWarMember[], opponentMembers: ClanWarMember[]) {
		const clanPlayers: Player[] = await this.client.http.detailedClanMembers(clanMembers);
		const a = clanPlayers.filter(res => res.ok).map((m, i) => {
			const heroes = m.heroes.filter(en => en.village === 'home');
			return {
				e: 0,
				m: i + 1,
				t: m.townHallLevel,
				h: heroes.map(en => en.level).reduce((prev, en) => en + prev, 0)
				// .concat(...Array(4 - heroes.length).fill(' '))
			};
		});

		const opponentPlayers: Player[] = await this.client.http.detailedClanMembers(opponentMembers as any);

		const b = opponentPlayers.filter(res => res.ok).map((m, i) => {
			const heroes = m.heroes.filter(en => en.village === 'home');
			return {
				e: 1,
				m: i + 1,
				t: m.townHallLevel,
				h: heroes.map(en => en.level).reduce((prev, en) => en + prev, 0)
				// .concat(...Array(4 - heroes.length).fill(' '))
			};
		});

		return this.chunk([...a, ...b].sort((a, b) => a.e - b.e).sort((a, b) => a.m - b.m));
	}

	private chunk<T>(items: T[] = []) {
		const chunk = 2;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
