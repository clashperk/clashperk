import { Clan, ClanMember } from 'clashofclans.js';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class TrophyBoardCommand extends Command {
	public constructor() {
		super('trophies', {
			aliases: ['trophies', 'trophyboard', 'tb'],
			category: 'activity',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'List of clan members with trophies.',
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
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
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		const header = `**\`# TROPHY  ${'NAME'.padEnd(20, ' ')}\`**`;
		const pages = [
			this.paginate(data.memberList, 0, 25)
				.items.map((member, index) => {
					const trophies = `${member.trophies.toString().padStart(5, ' ')}`;
					return `\`\u200e${(index + 1).toString().padStart(2, '0')} ${trophies}  ${this.padEnd(member.name)}\``;
				}),
			this.paginate(data.memberList, 25, 50)
				.items.map((member, index) => {
					const trophies = `${member.trophies.toString().padStart(5, ' ')}`;
					return `\`\u200e${(index + 26).toString().padStart(2, '0')} ${trophies}  ${this.padEnd(member.name)}\``;
				})
		];

		if (!pages[1].length) {
			return message.util!.send({
				embed: embed.setDescription([
					header,
					pages[0].join('\n')
				])
			});
		}

		const msg = await message.util!.send({
			embed: embed.setDescription([
				header,
				pages[0].join('\n')
			]).setFooter('Page 1/2')
		});

		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 45000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				await msg.edit({
					embed: embed.setDescription([
						header,
						pages[1].join('\n')
					]).setFooter('Page 2/2')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
			if (reaction.emoji.name === '⬅️') {
				await msg.edit({
					embed: embed.setDescription([
						header,
						pages[0].join('\n')
					]).setFooter('Page 1/2')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\').padEnd(20, ' ');
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private paginate(items: ClanMember[], start: number, end: number) {
		return { items: items.slice(start, end) };
	}
}
