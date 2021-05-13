import { Command, Argument } from 'discord-akairo';
import { MessageEmbed, Util, Message } from 'discord.js';
import { BLUE_NUMBERS } from '../../util/NumEmojis';
import { Clan, ClanWar } from 'clashofclans.js';
import { Collections } from '@clashperk/node';
import 'moment-duration-format';
import moment from 'moment';

export default class MissedAttacksCommand extends Command {
	public constructor() {
		super('missed', {
			aliases: ['missed', 'missing', 'remaining', 'rem'],
			category: 'war',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: [
					'Remaining or missed clan war attacks.',
					'',
					'Get War ID from `warlog` command.'
				],
				usage: '<#clanTag|last|warID>',
				examples: ['36081', '#8QU8J9LP', '#8QU8J9LP last']
			},
			optionFlags: ['--tag', '--war-id']
		});
	}

	public *args(msg: Message): unknown {
		const warID = yield {
			flag: '--war-id',
			type: Argument.union(
				[
					['last', 'prev']
				],
				Argument.range('integer', 1001, 9e6)
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
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.handleDirectCommand(message, data.tag, this.handler.modules.get('cwl-remaining')!, false);
			}
			embed.setDescription('Private War Log');
			return message.util!.send({ embed });
		}

		const body = await this.client.http.currentClanWar(data.tag);
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.handleDirectCommand(message, data.tag, this.handler.modules.get('cwl-remaining')!, false);
			}
			embed.setDescription('Not in War');
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

	private sendResult(message: Message, body: ClanWar) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`\u200e${body.clan.name} (${body.clan.tag})`, body.clan.badgeUrls.medium);

		if (body.state === 'preparation') {
			embed.setDescription([
				'**War Against**',
				`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Preparation'
			]);
			return message.util!.send({ embed });
		}

		const [OneRem, TwoRem] = [
			body.clan.members.filter(m => m.attacks && m.attacks.length === 1),
			body.clan.members.filter(m => !m.attacks)
		];
		embed.setDescription([
			'**War Against**',
			`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
			'',
			'**War State**',
			`${body.state.replace(/warEnded/g, 'War Ended').replace(/inWar/g, 'Battle Day')}`
		]);
		if (TwoRem.length) {
			embed.setDescription([
				embed.description,
				'',
				`**2 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
			]);
		}
		if (OneRem.length) {
			embed.setDescription([
				embed.description,
				'',
				`**1 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
			]);
		}

		const endTime = new Date(moment(body.endTime).toDate()).getTime();
		if (body.state === 'inWar') {
			// @ts-expect-error
			embed.setFooter(`Ends in ${this.toDate(endTime - Date.now())} ${body.id ? `(War ID #${body.id as number})` : ''}`);
		} else {
			// @ts-expect-error
			embed.setFooter(`Ended ${this.toDate(Date.now() - endTime)} ago ${body.id ? `(War ID #${body.id as number})` : ''}`);
		}

		return message.util!.send({ embed });
	}

	private toDate(ms: number) {
		return moment.duration(ms).format('D[d] H[h] m[m]', { trim: 'both mid' });
	}
}
