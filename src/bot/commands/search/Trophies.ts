import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

export default class TrophiesCommand extends Command {
	public constructor() {
		super('trophies', {
			aliases: ['trophies', 'trophy'],
			category: '_hidden',
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
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'```',
				`\u200e # TROPHY  ${'NAME'.padEnd(20, ' ')}`,
				data.memberList.map((member, index) => {
					const trophies = `${member.trophies.toString().padStart(5, ' ')}`;
					return `${(index + 1).toString().padStart(2, ' ')}  ${trophies}  ${this.padEnd(member.name)}`;
				}).join('\n'),
				'```'
			]);

		return message.util!.send({ embed });
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\').padEnd(20, ' ');
	}
}
