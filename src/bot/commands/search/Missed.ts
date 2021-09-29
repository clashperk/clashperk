import { Command, Argument } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';
import { BLUE_NUMBERS } from '../../util/NumEmojis';
import { Collections } from '../../util/Constants';
import { Clan, ClanWar } from 'clashofclans.js';
import { Util } from '../../util/Util';
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
				[['last']],
				Argument.range('integer', 1001, 9e6)
			),
			unordered: msg.interaction ? false : true,
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: msg.interaction ? false : true,
			match: msg.interaction ? 'option' : 'phrase',
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
				return this.handler.runCommand(message, this.handler.modules.get('cwl-attacks')!, { data });
			}
			embed.setDescription('Private War Log');
			return message.util!.send({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(data.tag);
		if (!body.ok) {
			return message.util!.send('**504 Request Timeout!**');
		}
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.runCommand(message, this.handler.modules.get('cwl-attacks')!, { data });
			}
			embed.setDescription('Not in War');
			return message.util!.send({ embeds: [embed] });
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

	private sendResult(message: Message, body: ClanWar & { id?: number }) {
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
			].join('\n'));
			return message.util!.send({ embeds: [embed] });
		}

		const [OneRem, TwoRem] = [
			body.clan.members.filter(m => m.attacks && m.attacks.length === 1),
			body.clan.members.filter(m => !m.attacks)
		];
		const endTime = new Date(moment(body.endTime).toDate()).getTime();

		embed.setDescription([
			'**War Against**',
			`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
			'',
			'**War State**',
			`${body.state.replace(/warEnded/g, 'War Ended').replace(/inWar/g, 'Battle Day')}`,
			'',
			'**End Time**',
			`${Util.getRelativeTime(endTime)}`
		].join('\n'));
		if (TwoRem.length) {
			embed.setDescription([
				embed.description,
				'',
				`**${body.attacksPerMember} ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
			].join('\n'));
		}

		if (OneRem.length && body.attacksPerMember !== 1) {
			embed.setDescription([
				embed.description,
				'',
				`**1 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
			].join('\n'));
		}

		if (body.id) embed.setFooter(`War ID #${body.id}`);
		return message.util!.send({ embeds: [embed] });
	}
}
