import { Clan, ClanWar, ClanWarLeagueGroup } from 'clashofclans.js';
import { parseHits } from '../../core/WarHitarte';
import { EMOJIS } from '../../util/Emojis';
import { Command, Argument } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';
import { ORANGE_NUMBERS } from '../../util/NumEmojis';

export default class CWLHitrateComamnd extends Command {
	public constructor() {
		super('cwl-hitrate', {
			aliases: ['cwl-hitrate'],
			category: '_owner',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES'],
			description: {
				content: [
					'Shows hitrates of the current round.',
					'',
					'**Flags**',
					'`--round <num>` or `-r <num>` to see specific round.'
				],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				},
				{
					id: 'round',
					match: 'option',
					flag: ['--round', '-r'],
					type: Argument.range('integer', 1, 7, true)
				},
				{
					id: 'stars',
					match: 'option',
					flag: ['--stars', '-s'],
					type: Argument.range('integer', 2, 3, true)
				}
			]
		});
	}

	public async exec(message: Message, { data, round, stars }: { data: Clan; round: number; stars: number }) {
		stars = typeof stars === 'number' ? stars : 3;
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send([
				'504 Request Timeout'
			]);
		}

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(data.tag);
			if (cw) return this.rounds(message, cw, data, round, stars);

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

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data, round, stars);
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clan: Clan, round: number, stars: number) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		if (round && round > rounds.length) {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
				.setDescription([
					'This round is not available yet!',
					'',
					'**Available Rounds**',
					Array(rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + 1}\`** ${EMOJIS.OK}`)
						.join('\n'),
					Array(body.rounds.length - rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + rounds.length + 1}\`** ${EMOJIS.WRONG}`)
						.join('\n')
				]);
			return message.util!.send({ embed });
		}

		const chunks: any[] = [];
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const hitrates = [];
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					hitrates.push(...[
						`**${clan.name} vs ${opponent.name}**`,
						`${parseHits(clan, opponent, stars).map(d => `\`\u200e${d.clan.rate.toFixed().padStart(3, ' ')}% ${`${d.clan.stars}/${d.clan.attacks}`.padStart(5, ' ')} \u200f\`\u200e ${ORANGE_NUMBERS[d.clan.townHall]} ${EMOJIS.VS} ${ORANGE_NUMBERS[d.clan.defTownHall]} \`\u200e ${`${d.opponent.stars}/${d.opponent.attacks}`.padStart(5, ' ')} ${d.opponent.rate.toFixed().padStart(3, ' ')}% \u200f\``).join('\n')}`
					]);

					chunks.push({ state: data.state, hitrates });
					break;
				}
			}
		}

		const item = round
			? chunks[round - 1]
			: chunks.length === 7
				? chunks.find(c => c.state === 'inWar') || chunks.slice(-1)[0]
				: chunks.slice(-2)[0];
		const pageIndex = chunks.indexOf(item);

		let page = pageIndex + 1;
		const paginated = this.paginate(chunks, page);

		if (chunks.length === 1) {
			return message.util!.send(paginated.pages[0].hitrates);
		}
		const msg = await message.util!.send(paginated.pages[0].hitrates);
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
				const { hitrates } = this.paginate(chunks, page).pages[0];
				await msg.edit(hitrates);
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				const { hitrates } = this.paginate(chunks, page).pages[0];
				await msg.edit(hitrates);
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private paginate(pages: any[], page = 1, pageLength = 1) {
		const maxPage = Math.ceil(pages.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			pages: pages.length > pageLength ? pages.slice(startIndex, startIndex + pageLength) : pages,
			page, maxPage, pageLength
		};
	}
}
