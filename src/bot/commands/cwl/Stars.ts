import { Message, MessageActionRow, MessageEmbed, MessageSelectMenu, Util } from 'discord.js';
import { Clan, ClanWar, ClanWarLeagueGroup } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { STOP_REASONS } from '../../util/Constants';

export default class CWLStarsCommand extends Command {
	public constructor() {
		super('cwl-stars', {
			aliases: ['cwl-stars'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows total CWL stars and attacks.',
				usage: '<clanTag>',
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
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) return message.util!.send('**504 Request Timeout!**');

		if (!body.ok) {
			const group = await this.client.storage.getWarTags(data.tag);
			if (group) return this.rounds(message, group, data);

			return message.util!.send(`**${data.name} is not in Clan War League!**`);
		}

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data);
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clan: Clan) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));

		const members: {
			[key: string]: {
				name: string;
				tag: string;
				of: number;
				attacks: number;
				stars: number;
				dest: number;
				lost: number;
				townhallLevel: number;
			};
		} = {};

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (['inWar', 'warEnded'].includes(data.state)) {
						for (const m of clan.members) {
							const member = members[m.tag] // eslint-disable-line
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									tag: m.tag,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0,
									townhallLevel: m.townhallLevel
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}

							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
							}
						}
					}
					break;
				}
			}
		}

		const leaderboard = Object.values(members);
		if (!leaderboard.length) return message.util!.send('**No attacks are available yet, try again later!**');
		leaderboard.sort((a, b) => b.dest - a.dest).sort((a, b) => b.stars - a.stars);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setDescription([
				`\u200e\` # STR HIT  ${'NAME'.padEnd(15, ' ')}\u200f\``,
				leaderboard.filter(
					m => m.of > 0
				).map(
					(m, i) => `\u200e\`${this.pad(++i)} ${this.pad(m.stars)}  ${[m.attacks, m.of].join('/')}  ${Util.escapeMarkdown(m.name).padEnd(15, ' ')}\u200f\``
				).join('\n')
			].join('\n'));

		const customID = this.client.uuid(message.author.id);
		const menu = new MessageSelectMenu()
			.setCustomId(customID)
			.setPlaceholder('Select a filter!')
			.addOptions([
				{
					label: 'Best Stars (Offense)',
					value: 'TOTAL',
					description: 'Best offense stars comparison.'
				},
				{
					label: 'Offense vs/ Defense',
					value: 'GAINED',
					description: '[Offense - Defense] stars comparison.'
				}
			]);
		const msg = await message.util!.send({ embeds: [embed], components: [new MessageActionRow({ components: [menu] })] });
		const collector = msg.createMessageComponentCollector({
			filter: action => action.customId === customID && action.user.id === message.author.id,
			time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customID && action.isSelectMenu()) {
				if (action.values[0] === 'TOTAL') {
					return action.update({ embeds: [embed] });
				}

				if (action.values[0] === 'GAINED') {
					leaderboard.sort((a, b) => b.stars - a.stars)
						.sort((a, b) => (b.stars - b.lost) - (a.stars - a.lost));

					const embed = new MessageEmbed()
						.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
						.setColor(this.client.embed(message))
						.setDescription([
							`**\`\u200e # STR GAIN ${'NAME'.padEnd(15, ' ')}\`**`,
							leaderboard.filter(m => m.of > 0)
								.map((m, i) => {
									const gained = m.stars - m.lost >= 0 ? `+${m.stars - m.lost}` : `${m.stars - m.lost}`;
									return `\`\u200e${this.pad(++i)} ${this.pad(m.stars)}  ${gained.padStart(3, ' ')}  ${m.name.padEnd(15, ' ')}\``;
								})
								.join('\n')
						].join('\n'));

					return action.update({ embeds: [embed] });
				}
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private pad(num: number, depth = 2) {
		return num.toString().padStart(depth, ' ');
	}
}
