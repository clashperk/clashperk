import { Clan, ClanWar, ClanWarLeagueGroup, ClanWarMember } from 'clashofclans.js';
import { MessageEmbed, Message, MessageActionRow, MessageButton } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Util } from '../../util/Util';
import moment from 'moment';

const stars: { [key: string]: string } = {
	0: '☆☆☆',
	1: '★☆☆',
	2: '★★☆',
	3: '★★★'
};

export default class CWLAttacksCommand extends Command {
	public constructor() {
		super('cwl-attacks', {
			aliases: ['cwl-attacks'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'],
			description: {
				content: 'Shows attacks of the current round.',
				usage: '<#clanTag>',
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

	public async exec(message: Message, { data, round }: { data: Clan; round: number }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) return message.util!.send('**504 Request Timeout!**');

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(data.tag);
			if (cw) return this.rounds(message, cw, data, round);

			return message.util!.send(`**${data.name} is not in Clan War League!**`);
		}

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data, round);
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clan: Clan, round: number) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(round => !round.warTags.includes('#0'));
		if (round && round > rounds.length) return;

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
						].join('\n'));
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

		const [PrevID, NextID] = [this.client.uuid(), this.client.uuid()];

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
}
