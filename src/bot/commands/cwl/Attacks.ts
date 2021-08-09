import { MessageEmbed, Message, MessageSelectMenu, MessageActionRow, MessageButton } from 'discord.js';
import { Clan, ClanWar, ClanWarLeagueGroup } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Util } from '../../util/Util';
import moment from 'moment';
import { STOP_REASONS } from '../../util/Constants';
import { RED_NUMBERS } from '../../util/NumEmojis';

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
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows attacks of the current round.',
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
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) return message.util!.send('**504 Request Timeout!**');

		if (!body.ok) {
			const group = await this.client.storage.getWarTags(data.tag);
			if (group) return this.rounds(message, group, data.tag);

			return message.util!.send(`**${data.name} is not in Clan War League!**`);
		}

		this.client.storage.pushWarTags(data.tag, body);
		return this.rounds(message, body, data.tag);
	}

	private async rounds(message: Message, body: ClanWarLeagueGroup, clanTag: string) {
		const rounds = body.rounds.filter(round => !round.warTags.includes('#0'));

		let i = 0;
		const missed: { [key: string]: { name: string; count: number } } = {};
		const chunks: { embed: MessageEmbed; state: string; round: number }[] = [];
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;

					const embed = new MessageEmbed()
						.setColor(this.client.embed(message))
						.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium);

					if (['warEnded', 'inWar'].includes(data.state)) {
						const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
						const attackers: { name: string; stars: number; destruction: number; mapPosition: number }[] = [];
						const slackers: { name: string; mapPosition: number; townHallLevel: number }[] = [];

						const clanMembers = data.clan.tag === clan.tag ? data.clan.members : data.opponent.members;
						clanMembers.sort((a, b) => a.mapPosition - b.mapPosition)
							.forEach((member, index) => {
								if (member.attacks?.length) {
									attackers.push({
										name: member.name,
										mapPosition: index + 1,
										stars: member.attacks[0].stars,
										destruction: member.attacks[0].destructionPercentage
									});
								} else {
									slackers.push({
										name: member.name,
										mapPosition: index + 1,
										townHallLevel: member.townhallLevel
									});
								}
							});

						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							`${data.state === 'inWar' ? 'Battle Day' : 'War Ended'} (${Util.getRelativeTime(endTimestamp)})`
						].join('\n'));

						if (attackers.length) {
							embed.setDescription([
								embed.description,
								'',
								`**Total Attacks - ${clanMembers.filter(m => m.attacks).length}/${data.teamSize}**`,
								attackers.map(
									mem => `\`\u200e${this.index(mem.mapPosition)} ${stars[mem.stars]} ${this.percentage(mem.destruction)}% ${this.padEnd(mem.name)}\``
								).join('\n')
							].join('\n'));
						}

						if (slackers.length) {
							embed.setDescription([
								embed.description,
								'',
								`**${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
								slackers.map(mem => `\`\u200e${this.index(mem.mapPosition)} ${this.padEnd(mem.name)}\``).join('\n')
							].join('\n'));
						} else {
							embed.setDescription([
								embed.description,
								'',
								`**No ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`
							].join('\n'));
						}
					}

					if (data.state === 'preparation') {
						const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
						embed.setDescription([
							'**War Against**',
							`\u200e${opponent.name} (${opponent.tag})`,
							'',
							`Preparation (${Util.getRelativeTime(startTimestamp)})`,
							'',
							'Wait for the Battle day!'
						].join('\n'));
					}

					if (data.state === 'warEnded') {
						for (const mem of clan.members) {
							if (mem.attacks?.length) continue;
							missed[mem.tag] = {
								name: mem.name, // eslint-disable-next-line
								count: Number((missed[mem.tag] || { count: 0 }).count) + 1
							};
						}
					}

					embed.setFooter(`Round #${++i}`);
					chunks.push({ state: data.state, round: i, embed });
					break;
				}
			}
		}

		if (!chunks.length || chunks.length !== rounds.length) return message.util!.send('**504 Request Timeout!**');
		const round = chunks.length === 7
			? chunks.find(c => c.state === 'inWar') ?? chunks.slice(-1)[0]
			: chunks.slice(-2)[0];
		if (chunks.length === 1) {
			return message.util!.send({ embeds: [round.embed] });
		}

		const options = chunks.map(ch => ({ label: `Round #${ch.round}`, value: ch.round.toString() }));
		const ids = {
			menu: this.client.uuid(message.author.id),
			button: this.client.uuid(message.author.id)
		};

		const menu = new MessageSelectMenu()
			.addOptions(options)
			.setCustomId(ids.menu)
			.setPlaceholder('Select a round!');

		const button = new MessageButton()
			.setStyle('SECONDARY')
			.setCustomId(ids.button)
			.setLabel('Show Overall Missed Attacks')
			.setDisabled(!Object.keys(missed).length);

		const rows = [
			new MessageActionRow()
				.addComponents(menu),
			new MessageActionRow()
				.addComponents(button)
		];

		const msg = await message.util!.send({
			embeds: [round.embed],
			components: [...rows]
		});
		const collector = msg.createMessageComponentCollector({
			filter: action => Object.values(ids).includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === ids.menu && action.isSelectMenu()) {
				const round = chunks.find(ch => ch.round === Number(action.values[0]));
				return action.update({ embeds: [round!.embed] });
			}

			if (action.customId === ids.button) {
				const members = Object.values(missed);
				const embed = new MessageEmbed()
					.setColor(this.client.embed(message))
					.setDescription([
						'**All Missed Attacks**',
						'',
						members.map(mem => `${RED_NUMBERS[mem.count]} ${Util.escapeMarkdown(mem.name)}`).join('\n')
					].join('\n'));
				embed.author = round.embed.author!;
				rows[1].components[0].setDisabled(true);

				await action.update({ components: [...rows] });
				await action.followUp({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(ids.menu);
			this.client.components.delete(ids.button);
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private padEnd(name: string) {
		return Util.escapeInlineCode(name).padEnd(20, ' ');
	}

	private index(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private percentage(num: number) {
		return num.toString().padStart(3, ' ');
	}
}
