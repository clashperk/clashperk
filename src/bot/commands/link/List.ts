import { Collection, GuildMember, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Clan, ClanMember } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from '../../lib';
import { Util } from '../../util';

// ASCII /[^\x00-\xF7]+/
export default class LinkListCommand extends Command {
	public constructor() {
		super('link-list', {
			category: 'none',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { tag, showTags }: { tag?: string; showTags?: boolean }) {
		const clan = await this.client.resolver.resolveClan(interaction, tag);
		if (!clan) return;
		if (!clan.members) return interaction.editReply(`${clan.name} does not have any clan members...`);

		const memberTags: { tag: string; user: string; user_tag?: string }[] = await this.client.http.getDiscordLinks(clan.memberList);
		const dbMembers = await this.client.db
			.collection(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: clan.memberList.map((m) => m.tag) } })
			.toArray();

		if (dbMembers.length) this.updateUsers(interaction, dbMembers);
		for (const member of dbMembers) {
			for (const m of member.entries) {
				if (!clan.memberList.find((mem) => mem.tag === m.tag)) continue;
				const ex = memberTags.find((mem) => mem.tag === m.tag);
				if (ex) ex.user_tag = member.user_tag?.split('#')[0];
				if (ex) continue;
				memberTags.push({ tag: m.tag, user: member.user, user_tag: member.user_tag?.split('#')[0] });
			}
		}

		const userIds = memberTags.reduce<string[]>((prev, curr) => {
			if (!prev.includes(curr.user)) prev.push(curr.user);
			return prev;
		}, []);
		const guildMembers = await interaction.guild.members.fetch({ user: userIds });

		// Players linked and on the guild.
		const onDiscord = memberTags.filter((mem) => guildMembers.has(mem.user));
		// Linked to discord but not on the guild.
		const notInDiscord = memberTags.filter((mem) => mem.user_tag && !guildMembers.has(mem.user));
		// Not linked to discord.
		const offDiscord = clan.memberList.filter(
			(m) => !notInDiscord.some((en) => en.tag === m.tag) && !memberTags.some((en) => en.tag === m.tag && guildMembers.has(en.user))
		);

		const embed = this.getEmbed(guildMembers, clan, showTags!, onDiscord, offDiscord, notInDiscord);
		if (!onDiscord.length) return interaction.editReply({ embeds: [embed.setColor(this.client.embed(interaction))] });

		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setStyle('SECONDARY')
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id }))
			)
			.addComponents(
				new MessageButton()
					.setStyle('SECONDARY')
					.setEmoji(EMOJIS.HASH)
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, showTags: true }))
			);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private getEmbed(
		guildMembers: Collection<string, GuildMember>,
		clan: Clan,
		showTag: boolean,
		onDiscord: { tag: string; user: string }[],
		offDiscord: ClanMember[],
		notInDiscord: any[]
	) {
		const chunks = Util.splitMessage(
			[
				`${EMOJIS.DISCORD} **Players on Discord: ${onDiscord.length}**`,
				onDiscord
					.map((mem) => {
						const member = clan.memberList.find((m) => m.tag === mem.tag)!;
						const user = showTag
							? member.tag.padStart(12, ' ')
							: guildMembers.get(mem.user)!.displayName.substring(0, 12).padStart(12, ' ');
						return `**✓** \`\u200e${this.parseName(member.name)}\u200f\` \u200e \` ${user} \u200f\``;
					})
					.join('\n'),
				'',
				`${EMOJIS.WRONG} **Players not on Discord: ${offDiscord.length + notInDiscord.length}**`,
				notInDiscord
					.map((mem) => {
						const member = clan.memberList.find((m) => m.tag === mem.tag)!;
						const user: string = showTag ? member.tag.padStart(12, ' ') : mem.user_tag.substring(0, 12).padStart(12, ' ');
						return `✘ \`\u200e${this.parseName(member.name)}\u200f\` \u200e \` ${user} \u200f\``;
					})
					.join('\n'),
				offDiscord
					.sort((a, b) => {
						const aName = a.name.toLowerCase();
						const bName = b.name.toUpperCase();
						return aName > bName ? 1 : aName < bName ? -1 : 0;
					})
					.map((mem) => `✘ \`\u200e${this.parseName(mem.name)}\u200f\` \u200e \` ${mem.tag.padStart(12, ' ')} \u200f\``)
					.join('\n')
			].join('\n'),
			{ maxLength: 4096 }
		);

		const embed = new MessageEmbed()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
			.setDescription(chunks[0]);
		if (chunks.length > 1) {
			chunks.slice(1).map((chunk) => embed.addField('\u200b', chunk));
		}

		return embed;
	}

	private parseName(name: string) {
		return Util.escapeBackTick(name).padEnd(15, ' ');
		// return name.replace(/[^\x00-\xF7]+/g, ' ').trim().padEnd(15, ' ');
	}

	private updateUsers(interaction: CommandInteraction, members: any[]) {
		for (const clan of members) {
			const member = interaction.guild!.members.cache.get(clan.user);
			if (member && clan.user_tag !== member.user.tag) {
				this.client.resolver.updateUserTag(interaction.guild!, clan.user);
			}
		}
	}
}
