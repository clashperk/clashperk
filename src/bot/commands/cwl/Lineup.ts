import { Clan, ClanWar, ClanWarLeague } from 'clashofclans.js';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

const states: { [key: string]: string } = {
	inWar: 'Battle Day',
	preparation: 'Preparation Day',
	warEnded: 'War Ended'
};

export default class CWLLineupComamnd extends Command {
	public constructor() {
		super('cwl-lineup', {
			aliases: ['cwl-lineup'],
			category: 'cwl-hidden',
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
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));

		const chunks: any[] = [];
		let i = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const embed = new MessageEmbed()
						.setColor(this.client.embed(message));
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium);
					embed.setDescription(`**War State: ${states[data.state]}**`);
					embed.addField('\u200b', [
						`**[${clan.name}](${this.clanURL(clan.tag)})**`,
						'```',
						'\u200e #  TH  NAME',
						...clan.members.sort((a, b) => a.mapPosition - b.mapPosition)
							.map((m, i) => `\u200e${(i + 1).toString().padStart(2, ' ')}  ${m.townhallLevel.toString().padStart(2, ' ')}  ${m.name}`),
						'```'
					]);
					embed.addField('\u200b', [
						`**[${opponent.name}](${this.clanURL(opponent.tag)})**`,
						'```',
						'\u200e #  TH  NAME',
						...opponent.members.sort((a, b) => a.mapPosition - b.mapPosition)
							.map((m, i) => `\u200e${(i + 1).toString().padStart(2, ' ')}  ${m.townhallLevel.toString().padStart(2, ' ')}  ${m.name}`),
						'```'
					]);

					embed.setFooter(`Round #${++i}`);
					chunks.push({ state: data.state, embed });
				}
			}
		}

		if (!chunks.length) return message.util!.send('**504 Request Timeout!**');

		const item = chunks.length === 7
			? chunks.find(c => c.state === 'preparation') || chunks.slice(-1)[0]
			: chunks.slice(-2).reverse()[0];
		const pageIndex = chunks.indexOf(item);

		let page = pageIndex + 1;
		const paginated = this.paginate(chunks, page);

		if (chunks.length === 1) {
			return message.util!.send({ embed: paginated.items[0].embed });
		}
		const msg = await message.util!.send({ embed: paginated.items[0].embed });
		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				const { embed } = this.paginate(chunks, page).items[0];
				await msg.edit({ embed });
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				const { embed } = this.paginate(chunks, page).items[0];
				await msg.edit({ embed });
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}
		});

		collector.on('end', async () => msg.reactions.removeAll().catch(() => null));
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private paginate(items: any[], page = 1, pageLength = 1) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
	}
}
