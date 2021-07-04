import { MessageEmbed, Message, MessageActionRow, MessageButton } from 'discord.js';
import { Clan, ClanWar, ClanWarLeagueGroup } from 'clashofclans.js';
import { Command, Argument } from 'discord-akairo';
import { EMOJIS } from '../../util/Emojis';
import { Util } from '../../util/Util';
import moment from 'moment';

export default class CWLRemainingCommand extends Command {
	public constructor() {
		super('cwl-remaining', {
			aliases: ['cwl-remaining', 'cwl-missing'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'],
			description: {
				content: [
					'Shows remaining attacks of the current round.',
					'',
					'**Flags**',
					'`--round <num>` to see specific round.'
				],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--round', '--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
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

		const body = await this.client.http.clanWarLeague(data.tag);
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
			return message.util!.send({ embeds: [embed] });
		}

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data, round);
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clan: Clan, round: number) {
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
					new Array(rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + 1}\`** ${EMOJIS.OK}`)
						.join('\n'),
					new Array(body.rounds.length - rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + rounds.length + 1}\`** ${EMOJIS.WRONG}`)
						.join('\n')
				].join('\n'));
			return message.util!.send({ embeds: [embed] });
		}

		const chunks: { embed: MessageEmbed; state: string }[] = [];
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
						let missing = '';
						let index = 0;
						for (const member of this.sort(clan.members)) {
							if (member.attacks && member.attacks.length === 1) {
								++index;
								continue;
							}
							missing += `\`\u200e${this.index(++index)} ${this.padEnd(member.name)}\`\n`;
						}

						const end = new Date(moment(data.endTime).toDate()).getTime();
						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							`War ended ${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`,
							'',
							`**Missed Attacks** - ${clan.members.filter(m => !m.attacks).length}/${data.teamSize}`,
							missing || 'All Players Attacked'
						].join('\n'));
					}

					if (data.state === 'inWar') {
						const ends = new Date(moment(data.endTime).toDate()).getTime();
						let missing = '';
						let index = 0;
						for (const member of this.sort(clan.members)) {
							if (member.attacks && member.attacks.length === 1) {
								++index;
								continue;
							}
							missing += `\`${this.index(++index)} ${this.padEnd(member.name)}\`\n`;
						}

						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							`Battle day ends in ${moment.duration(ends - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`,
							'',
							`**Missing Attacks** - ${clan.members.filter(m => !m.attacks).length}/${data.teamSize}`,
							missing || 'All Players Attacked'
						].join('\n'));
					}

					if (data.state === 'preparation') {
						const start = new Date(moment(data.startTime).toDate()).getTime();
						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							`Preparation day ends in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`
						].join('\n'));
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
				? chunks.find(c => c.state === 'inWar') ?? chunks.slice(-1)[0]
				: chunks.slice(-2)[0];
		const pageIndex = chunks.indexOf(item);

		const page = pageIndex + 1;
		const pages = chunks.map(chunk => chunk.embed);
		const paginated = Util.paginate(pages, page);

		if (chunks.length === 1) {
			return message.util!.send({ embeds: [paginated.first()] });
		}

		const [NextID, PrevID] = [this.client.uuid(), this.client.uuid()];
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomID(PrevID)
					.setLabel('Previous')
					.setEmoji('⬅️')
					.setStyle('SECONDARY')
			)
			.addComponents(
				new MessageButton()
					.setCustomID(NextID)
					.setLabel('Next')
					.setEmoji('➡️')
					.setStyle('SECONDARY')
			);

		const msg = await message.util!.send({ embeds: [paginated.first()], components: [row] });
		const collector = msg.createMessageComponentCollector({
			filter: action => [PrevID, NextID].includes(action.customID) && action.user.id === message.author.id,
			time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customID === NextID) {
				const next = paginated.next();
				await action.update({ embeds: [Util.paginate(pages, next.page).first()] });
			}

			if (action.customID === PrevID) {
				const next = paginated.previous();
				await action.update({ embeds: [Util.paginate(pages, next.page).first()] });
			}
		});

		collector.on('end', async () => {
			this.client.components.delete(NextID);
			this.client.components.delete(PrevID);
			if (msg.editable) await msg.edit({ components: [] });
		});
	}

	private sort(items: any[]) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}

	private index(num: number) {
		return num.toString().padStart(2, '0');
	}

	private padEnd(msg: string) {
		return Util.escapeInlineCode(msg).padEnd(20, ' ');
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
