import { Clan, CurrentWar, ClanWarMember } from 'clashofclans.js';
import { Command, PrefixSupplier, Argument } from 'discord-akairo';
import { MessageEmbed, Util, Message } from 'discord.js';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis';
import { Collections } from '@clashperk/node';
import 'moment-duration-format';
import moment from 'moment';

export default class WarCommand extends Command {
	public constructor() {
		super('war', {
			aliases: ['war'],
			category: 'war',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: [
					'Current or previous clan war details.',
					'',
					'Get War ID from `warlog` comamnd.'
				],
				usage: '<#clanTag|last|warID>',
				examples: ['36081', '#8QU8J9LP', '#8QU8J9LP last']
			},
			optionFlags: ['--tag', '--war-id']
		});
	}

	public *args(msg: Message) {
		const warID = yield {
			flag: '--war-id',
			type: Argument.union(
				[
					['last', 'prev']
				],
				Argument.range('integer', 1001, 1e5)
			),
			unordered: msg.hasOwnProperty('token') ? false : true,
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: msg.hasOwnProperty('token') ? false : true,
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data, warID };
	}

	public async exec(message: Message, { data, warID }: { data: Clan; warID?: number }) {
		if (warID) return this.getWar(message, warID, data.tag);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`\u200e${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res?.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${(this.handler.prefix as PrefixSupplier)(message) as string}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Private War Log');
			}
			return message.util!.send({ embed });
		}

		const body: CurrentWar = await this.client.http.currentClanWar(data.tag);

		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res?.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${(this.handler.prefix as PrefixSupplier)(message) as string}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Not in War');
			}
			return message.util!.send({ embed });
		}

		return this.sendResult(message, body);
	}

	private async getWar(message: Message, id: number | string, tag: string) {
		let data: any = null;
		if (typeof id === 'string' && tag) {
			data = await this.client.db.collection(Collections.CLAN_WARS)
				.find({ 'clan.tag': tag, 'groupWar': false, 'state': 'warEnded' })
				.sort({ preparationStartTime: -1 })
				.limit(1)
				.next();
		} else if (typeof id === 'number') {
			data = await this.client.db.collection(Collections.CLAN_WARS).findOne({ id });
		}

		if (!data) {
			return message.util!.send('**No War found for the specified War ID.**');
		}

		return this.sendResult(message, data);
	}

	private sendResult(message: Message, body: CurrentWar) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`\u200e${body.clan.name} (${body.clan.tag})`, body.clan.badgeUrls.medium);

		if (body.state === 'preparation') {
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Preparation Day',
				`Starts in ${moment.duration(new Date(moment(body.startTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`
			]);
		}

		if (body.state === 'inWar') {
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Battle Day',
				`Ends in ${moment.duration(new Date(moment(body.endTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`,
				'',
				'**War Stats**',
				`${EMOJIS.STAR} ${body.clan.stars} / ${body.opponent.stars}`,
				`${EMOJIS.FIRE} ${body.clan.destructionPercentage.toFixed(2)}% / ${body.opponent.destructionPercentage.toFixed(2)}%`,
				`${EMOJIS.SWORD} ${body.clan.attacks} / ${body.opponent.attacks}`
			]);
		}

		if (body.state === 'warEnded') {
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'War Ended',
				`Ended ${moment.duration(Date.now() - new Date(moment(body.endTime).toDate()).getTime()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })} ago`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`,
				'',
				'**War Stats**',
				`${EMOJIS.STAR} ${body.clan.stars} / ${body.opponent.stars}`,
				`${EMOJIS.FIRE} ${body.clan.destructionPercentage.toFixed(2)}% / ${body.opponent.destructionPercentage.toFixed(2)}%`,
				`${EMOJIS.SWORD} ${body.clan.attacks} / ${body.opponent.attacks}`
			]);
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`\u200e${Util.escapeMarkdown(body.clan.name)}`,
			`${this.count(body.clan.members)}`,
			'',
			`\u200e${Util.escapeMarkdown(body.opponent.name)}`,
			`${this.count(body.opponent.members)}`
		]);

		if (body.hasOwnProperty('id')) {
			// @ts-expect-error
			embed.setFooter(`War ID #${body.id as number}`);
		}

		return message.util!.send({ embed });
	}

	private count(members: ClanWarMember[] = []) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: Number(entry[0]), total: Number(entry[1]) }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${TOWN_HALLS[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n');
	}

	private chunk(items: { level: number; total: number }[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
