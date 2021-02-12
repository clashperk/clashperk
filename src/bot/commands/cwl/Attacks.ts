import { Clan, ClanWar, ClanWarLeague, ClanWarMember } from 'clashofclans.js';
import { MessageEmbed, Message, Util } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { EMOJIS } from '../../util/Emojis';
import moment from 'moment';

const stars: { [key: string]: string } = {
	0: '☆☆☆',
	1: '★☆☆',
	2: '★★☆',
	3: '★★★'
};

export default class CWLAttacksComamnd extends Command {
	public constructor() {
		super('cwl-attacks', {
			aliases: ['cwl-attacks'],
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: [
					'Shows attacks of the current round.',
					'',
					'**Flags**',
					'`--round <num>` or `-r <num>` to see specific round.'
				],
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--round', '-r'],
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
				}
			]
		});
	}

	public async exec(message: Message, { data, round }: { data: Clan; round: number }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body: ClanWarLeague = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send([
				'504 Request Timeout'
			]);
		}

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(data.tag);
			if (cw) return this.rounds(message, cw, data, round);

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
		return this.rounds(message, body, data, round);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan, round: number) {
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
					if (data.state === 'warEnded') {
						const end = new Date(moment(data.endTime).toDate()).getTime();
						let attacks = '';
						let index = 0;
						const clanMembers = data.clan.tag === clan.tag ? data.clan.members : data.opponent.members;
						for (const member of this.sort(clanMembers)) {
							if (!member.attacks) {
								++index;
								continue;
							}
							attacks += `\`\u200e${this.index(++index)} ${stars[member.attacks[0].stars]} ${this.percentage(member.attacks[0].destructionPercentage)}% ${this.padEnd(member.name)}\`\n`;
						}

						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							`War ended ${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`,
							'',
							`**Attacks** - ${clanMembers.filter(m => m.attacks).length}/${data.teamSize}`,
							`${attacks || 'Nobody Attacked'}`
						]);
					}

					if (data.state === 'inWar') {
						const ends = new Date(moment(data.endTime).toDate()).getTime();
						let attacks = '';
						let index = 0;
						const clanMembers = data.clan.tag === clan.tag ? data.clan.members : data.opponent.members;
						for (const member of this.sort(clanMembers)) {
							if (!member.attacks) {
								++index;
								continue;
							}
							attacks += `\`${this.index(++index)} ${stars[member.attacks[0].stars]} ${this.percentage(member.attacks[0].destructionPercentage)}% ${this.padEnd(member.name)}\`\n`;
						}

						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							`Battle day ends in ${moment.duration(ends - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`,
							'',
							`**Attacks - ${clanMembers.filter(m => m.attacks).length}/${data.teamSize}**`,
							`${attacks || 'Nobody Attacked Yet'}`
						]);
					}

					if (data.state === 'preparation') {
						const start = new Date(moment(data.startTime).toDate()).getTime();
						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							`Preparation day ends in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`
						]);
					}

					embed.setFooter(`Round #${++i}`);

					chunks.push({ state: data.state, embed });
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
				await reaction.users.remove(message.author.id);
				return message;
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				const { embed } = this.paginate(chunks, page).items[0];
				await msg.edit({ embed });
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
	}

	private sort(items: ClanWarMember[]) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}

	private padEnd(data: string) {
		return Util.escapeInlineCode(data).padEnd(20, ' ');
	}

	private index(num: number) {
		return num.toString().padStart(2, '0');
	}

	private percentage(num: number) {
		return num.toString().padStart(3, ' ');
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
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
