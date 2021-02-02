import { Command, PrefixSupplier } from 'discord-akairo';
import { MessageEmbed, Util, Message } from 'discord.js';
import { Clan, CurrentWar } from 'clashofclans.js';
import { BLUE_EMOJI } from '../../util/Emojis';
import 'moment-duration-format';
import moment from 'moment';

export default class RemainingAttacksCommand extends Command {
	public constructor() {
		super('remaining', {
			aliases: ['remaining', 'missing', 'missing-attacks', 'rem'],
			category: 'cwl',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: [
					'Shows info about remaining attacks.',
					'',
					'**Flags**',
					'`--cwl` or `cwl` for cwl missing attacks.'
				],
				usage: '<clanTag> [--cwl/cwl]',
				examples: ['#8QU8J9LP', '8QU8J9LP --cwl', '#8QU8J9LP cwl']
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
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res?.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${(this.handler.prefix as PrefixSupplier)(message) as string}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Private WarLog');
			}
			return message.util!.send({ embed });
		}

		const body: CurrentWar = await this.client.http.currentClanWar(data.tag);

		if (body.state === 'notInWar') {
			const isCWL = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (isCWL) {
				embed.setDescription(`Clan is in CWL. Run \`${(this.handler.prefix as PrefixSupplier)(message) as string}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Not in War');
			}
			return message.util!.send({ embed });
		}

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
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`)
			]);
		}
		if (OneRem.length) {
			embed.setDescription([
				embed.description,
				'',
				`**1 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`)
			]);
		}

		const endTime = new Date(moment(body.endTime).toDate()).getTime();
		if (body.state === 'inWar') embed.setFooter(`Ends in ${moment.duration(endTime - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`);
		else embed.setFooter(`Ended ${moment.duration(Date.now() - endTime).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })} ago`);

		return message.util!.send({ embed });
	}
}
