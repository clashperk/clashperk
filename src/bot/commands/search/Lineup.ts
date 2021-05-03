import { Command } from 'discord-akairo';
import { MessageEmbed, Util, Message } from 'discord.js';
import { BLUE_NUMBERS, ORANGE_NUMBERS, WHITE_NUMBERS } from '../../util/NumEmojis';
import { Clan, ClanWarClan, CurrentWar } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';

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
			unordered: msg.hasOwnProperty('token') ? false : true,
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res?.ok) {
				return this.handler.handleDirectCommand(message, data.tag, this.handler.modules.get('cwl-lineup-list')!, false);
			}
			embed.setDescription('Private WarLog');
			return message.util!.send({ embed });
		}

		const body: CurrentWar = await this.client.http.currentClanWar(data.tag);
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res.ok) {
				return this.handler.handleDirectCommand(message, data.tag, this.handler.modules.get('cwl-lineup-list')!, false);
			}
			embed.setDescription('Not in War');
			return message.util!.send({ embed });
		}

		const chunks = Util.splitMessage([
			`**${body.clan.name} (${body.clan.tag})**`,
			`${EMOJIS.HASH}${EMOJIS.TOWNHALL} **NAME**`,
			body.clan.members.sort((a, b) => a.mapPosition - b.mapPosition).map(
				mem => `${BLUE_NUMBERS[mem.mapPosition]}${ORANGE_NUMBERS[mem.townhallLevel]} ${Util.escapeMarkdown(mem.name)}`
			).join('\n'),
			'',
			`**${body.opponent.name} (${body.opponent.tag})**`,
			`${EMOJIS.HASH}${EMOJIS.TOWNHALL} **NAME**`,
			body.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition).map(
				mem => `${BLUE_NUMBERS[mem.mapPosition]}${ORANGE_NUMBERS[mem.townhallLevel]} ${Util.escapeMarkdown(mem.name)}`
			).join('\n')
		]);

		const interaction = message.hasOwnProperty('token');
		if (interaction) await message.util!.send(chunks[0]);
		if (chunks.length === 1 && interaction) return;
		return message.channel.send(chunks.slice(interaction ? 1 : 0), { split: true });
	}

	private flat(townHalls: number[], clan: ClanWarClan) {
		const roster = this.roster(clan);
		return townHalls.map(th => WHITE_NUMBERS[roster[th] || 0]).join('');
	}

	private roster(clan: any) {
		return clan.members.reduce((count: any, member: any) => {
			const townHall = (member.townHallLevel || member.townhallLevel);
			count[townHall] = (count[townHall] as number || 0) + 1;
			return count;
		}, {} as { [key: string]: number });
	}
}
