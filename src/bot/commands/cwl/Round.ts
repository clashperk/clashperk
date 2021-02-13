import { Clan, ClanWarLeague, ClanWar, ClanWarMember } from 'clashofclans.js';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis';
import { BROWN_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Message } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import moment from 'moment';

export default class CWLRoundComamnd extends Command {
	public constructor() {
		super('cwl-round', {
			aliases: ['round', 'cwl-war', 'cwl-round'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: [
					'Shows info about the current round.',
					'',
					'**Flags**',
					'`--round <num>` or `-r <num>` to see specific round.'
				],
				usage: '<clanTag> [--round/-r] [round]',
				examples: ['#8QU8J9LP', '#8QU8J9LP -r 5', '#8QU8J9LP --round 4']
			},
			optionFlags: ['--round', '--tag'],
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

	public *args(msg: Message) {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		const round = yield {
			match: 'option',
			flag: ['--round'],
			type: Argument.range('integer', 1, 7, true)
		};

		return { data, round };
	}

	public async exec(message: Message, { data, round }: { data: Clan; round: number }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body: ClanWarLeague = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send('**504 Request Timeout!**');
		}

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(data.tag);
			if (cw) return this.rounds(message, cw, data, round);

			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		this.client.storage.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data, round);
	}

	private async rounds(message: Message, body: ClanWarLeague, clan: Clan, round: number) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));
		if (round && round > rounds.length) {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
				.setDescription([
					'This round is not available yet!',
					'',
					'**Available Rounds**',
					new Array(rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + 1}\`** ${EMOJIS.OK}`)
						.join('\n'),
					new Array(body.rounds.length - rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + rounds.length + 1}\`** ${EMOJIS.WRONG}`)
						.join('\n')
				]);
			return message.util!.send({ embed });
		}

		const chunks: any[] = [];
		let index = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clan.tag ? data.opponent : data.clan;
					const embed = new MessageEmbed()
						.setColor(this.client.embed(message));
					embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
						.addField('War Against', `\u200e${opponent.name} (${opponent.tag})`)
						.addField('Team Size', `${data.teamSize}`);
					if (data.state === 'warEnded') {
						const end = new Date(moment(data.endTime).toDate()).getTime();
						embed.addField('State', [
							'War Ended',
							`Ended ${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`
						])
							.addField('Stats', [
								`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
								`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.ATTACK_SWORD} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
								`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.FIRE} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
							]);
					}
					if (data.state === 'inWar') {
						const end = new Date(moment(data.endTime).toDate()).getTime();
						embed.addField('State', [
							'Battle Day',
							`Ends in ${moment.duration(end - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`
						])
							.addField('Stats', [
								`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
								`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.ATTACK_SWORD} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
								`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.FIRE} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
							]);
					}
					if (data.state === 'preparation') {
						const start = new Date(moment(data.startTime).toDate()).getTime();
						embed.addField('State', [
							'Preparation',
							`Ends in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`
						]);
					}
					embed.addField('Rosters', [
						`\u200e**${clan.name}**`,
						`${this.count(clan.members)}`
					]);
					embed.addField('\u200e', [
						`\u200e**${opponent.name}**`,
						`${this.count(opponent.members)}`
					]);
					embed.setFooter(`Round #${++index}`);

					chunks.push({ state: data.state, embed });
					break;
				}
			}
		}

		if (!chunks.length) return message.util!.send('**504 Request Timeout!**');

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

	private count(members: ClanWarMember[]) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: Number(entry[0]), total: entry[1] }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${TOWN_HALLS[th.level]} ${BROWN_NUMBERS[th.total]}`)
				.join(' '))
			.join('\n');
	}

	private chunk(items: { [kye: string]: number }[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
