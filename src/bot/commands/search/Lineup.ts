import { BLUE_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS, HERO_PETS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan, ClanWarMember, Player, WarClan } from 'clashofclans.js';
import { Util } from '../../util/Util';

const states: { [key: string]: string } = {
	inWar: 'Battle Day',
	preparation: 'Preparation',
	warEnded: 'War Ended'
};

export default class LineupCommand extends Command {
	public constructor() {
		super('lineup', {
			aliases: ['lineup'],
			category: 'war',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: ['Shows current war lineup details.'],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.runCommand(message, this.handler.modules.get('cwl-lineup')!, { data });
			}
			embed.setDescription('Private WarLog');
			return message.util!.send({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(data.tag);
		if (!body.ok) return message.util!.send('**504 Request Timeout!');
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.runCommand(message, this.handler.modules.get('cwl-lineup')!, { data });
			}
			embed.setDescription('Clan is not in war!');
			return message.util!.send({ embeds: [embed] });
		}

		const embeds = await this.getComparisonLineup(body.state, body.clan, body.opponent);
		for (const embed of embeds) embed.setColor(this.client.embed(message));

		return message.util!.send({ embeds });
	}

	private async getComparisonLineup(state: string, clan: WarClan, opponent: WarClan) {
		const linups = await this.rosters(
			clan.members.sort((a, b) => a.mapPosition - b.mapPosition),
			opponent.members.sort((a, b) => a.mapPosition - b.mapPosition)
		);
		const embed = new MessageEmbed();
		embed.setAuthor(`\u200e${clan.name} (${clan.tag})`, clan.badgeUrls.medium);

		embed.setDescription(
			[
				'**War Against**',
				`**\u200e${opponent.name} (${opponent.tag})**`,
				'',
				`\u200e${EMOJIS.HASH} \`TH HERO \u2002  \u2002 TH HERO \``,
				linups.map(
					(lineup, i) => {
						const desc = lineup.map(en => `${this.pad(en.t, 2)} ${this.pad(en.h, 4)}`).join(' \u2002vs\u2002 ');
						return `${BLUE_NUMBERS[i + 1]} \`${desc} \``;
					}
				).join('\n')
			].join('\n')
		);
		embed.setFooter(`${states[state]}`);

		return [embed];
	}

	private async rosters(clanMembers: ClanWarMember[], opponentMembers: ClanWarMember[]) {
		const clanPlayers: Player[] = await this.client.http.detailedClanMembers(clanMembers);
		const a = clanPlayers.filter(res => res.ok).map((m, i) => {
			const heroes = m.heroes.filter(en => en.village === 'home');
			const pets = m.troops.filter(en => en.village === 'home' && en.name in HERO_PETS);
			return {
				e: 0,
				m: i + 1,
				t: m.townHallLevel,
				p: pets.map(en => en.level).reduce((prev, en) => en + prev, 0),
				h: heroes.map(en => en.level).reduce((prev, en) => en + prev, 0)
				// .concat(...Array(4 - heroes.length).fill(' '))
			};
		});

		const opponentPlayers: Player[] = await this.client.http.detailedClanMembers(opponentMembers as any);
		const b = opponentPlayers.filter(res => res.ok).map((m, i) => {
			const heroes = m.heroes.filter(en => en.village === 'home');
			const pets = m.troops.filter(en => en.village === 'home' && en.name in HERO_PETS);
			return {
				e: 1,
				m: i + 1,
				t: m.townHallLevel,
				p: pets.map(en => en.level).reduce((prev, en) => en + prev, 0),
				h: heroes.map(en => en.level).reduce((prev, en) => en + prev, 0)
				// .concat(...Array(4 - heroes.length).fill(' '))
			};
		});

		return Util.chunk([...a, ...b].sort((a, b) => a.e - b.e).sort((a, b) => a.m - b.m), 2);
	}

	private pad(num: number, depth: number) {
		return num.toString().padStart(depth, ' ');
	}
}
