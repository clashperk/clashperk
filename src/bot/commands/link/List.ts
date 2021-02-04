import { Message, MessageEmbed, Util } from 'discord.js';
import { COLLECTIONS } from '../../util/Constants';
import { Clan, ClanMember } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

// ASCII /[^\x00-\x7F]+/
export default class LinkListCommand extends Command {
	public constructor() {
		super('link-list', {
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			channel: 'guild',
			description: {}
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
		const clan: Clan = await this.client.http.clan(data.tag);
		const memberTags = await this.client.http.getDiscordLinks(clan.memberList);

		const dbMembers = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.find({ 'entries.tag': { $in: clan.memberList.map(m => m.tag) } })
			.toArray();

		for (const member of dbMembers) {
			for (const m of member.entries) {
				if (!data.memberList.find(mem => mem.tag === m.tag)) continue;
				if (memberTags.find(mem => mem.tag === m.tag)) continue;
				memberTags.push({ tag: m.tag, user: member.user });
			}
		}

		await message.guild!.members.fetch({ user: memberTags.map(m => m.user) });

		const onDiscord = memberTags.filter(mem => message.guild!.members.cache.has(mem.user));
		const offDiscord = clan.memberList.filter(m => !memberTags.some(en => en.tag === m.tag));

		const embed = this.buildEmbed(message, clan, false, onDiscord, offDiscord);
		const msg = await message.util!.send({ embed });
		await msg.react('🔗');

		const collector = msg.createReactionCollector(
			(reaction, user) => ['🔗'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '🔗') {
				const embed = this.buildEmbed(message, clan, true, onDiscord, offDiscord);
				return message.util!.send({ embed });
			}
		});

		collector.on('end', () => msg.reactions.removeAll());
	}

	private buildEmbed(message: Message, clan: Clan, showTag: boolean, onDiscord: { tag: string; user: string }[], offDiscord: ClanMember[]) {
		const chunks = Util.splitMessage([
			`${EMOJIS.DISCORD} **Players on Discord: ${onDiscord.length}**`,
			onDiscord.map(
				mem => {
					const member = clan.memberList.find(m => m.tag === mem.tag)!;
					const user = showTag ? member.tag : message.guild!.members.cache.get(mem.user)!.displayName.substring(0, 10).padStart(10, ' ');
					return `**✓** \`\u200e${this.parseName(member.name)}\u200f\` \u200e \` ${user} \u200f\``;
				}
			).join('\n'),
			'',
			`${EMOJIS.WRONG} **Players not on Discord: ${offDiscord.length}**`,
			offDiscord.sort((a, b) => {
				const aName = a.name.toLowerCase();
				const bName = b.name.toUpperCase();
				return aName > bName ? 1 : aName < bName ? -1 : 0;
			}).map(
				mem => `✘ \`\u200e${this.parseName(mem.name)}\u200f\` \u200e \` ${mem.tag.padStart(10, ' ')} \u200f\``
			).join('\n')
		]);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setDescription(chunks[0]);
		if (chunks.length > 1) {
			chunks.slice(1).map(chunk => embed.addField('\u200b', chunk));
		}

		return embed;
	}

	private parseName(name: string) {
		return name.replace(/[^\x00-\xF7]+/g, ' ').trim().padEnd(15, ' ');
	}
}
