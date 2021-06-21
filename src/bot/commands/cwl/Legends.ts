import { EMOJIS, TOWN_HALLS } from '../../util/Emojis';
import { Util, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class CWLTopCommand extends Command {
	public constructor() {
		super('cwl-legends', {
			aliases: ['cwl-legends', 'cwl-top', 'cwl-mvp'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'War League Legend scoreboard of the clan.',
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched.filter(res => res.ok).map(m => {
			const value = m.achievements.find(achievement => achievement.name === 'War League Legend')?.value ?? 0;
			return { townHallLevel: m.townHallLevel, name: m.name, stars: value };
		});

		members.sort((a, b) => b.stars - a.stars);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'War League Legend Scoreboard',
				`${EMOJIS.TOWNHALL}\`\u200e STAR  ${this.padEnd('NAME')}\``,
				members.filter(m => m.stars > 0).slice(0, 30)
					.map(member => {
						const name = this.padEnd(member.name);
						const stars = this.padStart(member.stars.toString());
						return `${TOWN_HALLS[member.townHallLevel]}\`\u200e ${stars}  ${name.replace(/\`/g, '\\')}\``;
					})
					.join('\n')
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}

	private padStart(msg: string) {
		return msg.padStart(4, ' ');
	}

	private padEnd(msg: string) {
		return Util.escapeInlineCode(msg).padEnd(20, ' ');
	}
}
