import { Clan, ClanWarLeague } from 'clashofclans.js';
import { BROWN_NUMBERS } from '../../util/NumEmojis';
import { TOWN_HALLS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import moment from 'moment';

export default class CWLRosterComamnd extends Command {
	public constructor() {
		super('cwl-roster', {
			aliases: ['roster', 'cwl-roster'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows roster and Town-Hall distribution.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message) {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const body: ClanWarLeague = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send([
				'504 Request Timeout'
			]);
		}

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message));

		if (!body.ok) {
			embed.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		embed.setFooter(`${moment(body.season).format('MMMM YYYY')}`)
			.setAuthor('CWL Roster')
			.setDescription('CWL Roster and Town-Hall Distribution');

		let index = 0;
		for (const clan of body.clans) {
			const reduced = clan.members.reduce((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {} as { [key: string]: number });

			const townHalls = Object.entries(reduced)
				.map(entry => ({ level: Number(entry[0]), total: Number(entry[1]) }))
				.sort((a, b) => b.level - a.level);

			embed.addField(`\u200e${++index}. ${clan.tag === data.tag ? `__${clan.name} (${clan.tag})__` : `${clan.name} (${clan.tag})`}`, [
				this.chunk(townHalls)
					.map(chunks => chunks.map(th => `${TOWN_HALLS[th.level]} ${BROWN_NUMBERS[th.total]}\u200b`)
						.join(' '))
					.join('\n')
			]);
		}

		return message.util!.send({ embed });
	}

	private chunk(items: { [key: string]: number }[]) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
