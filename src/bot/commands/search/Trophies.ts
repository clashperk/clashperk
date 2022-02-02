import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

export default class TrophiesCommand extends Command {
	public constructor() {
		super('trophies', {
			aliases: ['trophies', 'trophy'],
			category: 'none',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'List of clan members with trophies.',
				usage: '<#clanTag>',
				examples: ['#2Q98URCGY']
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
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.medium })
			.setDescription([
				'```',
				`\u200e # TROPHY  ${'NAME'}`,
				data.memberList.map((member, index) => {
					const trophies = `${member.trophies.toString().padStart(5, ' ')}`;
					return `${(index + 1).toString().padStart(2, ' ')}  ${trophies}  \u200e${member.name}`;
				}).join('\n'),
				'```'
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}
}
