import { Collection, GuildMember, CommandInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import { Clan, ClanMember } from 'clashofclans.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { UserInfoModel } from '../../types/index.js';

// ASCII /[^\x00-\xF7]+/
export default class LinkListCommand extends Command {
	public constructor() {
		super('link-list', {
			category: 'none',
			clientPermissions: ['EmbedLinks'],
			channel: 'guild',
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { tag, showTags }: { tag?: string; showTags?: boolean }) {
		const clan = await this.client.resolver.resolveClan(interaction, tag);
		if (!clan) return;
		if (!clan.members) return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));

		const memberTags = await this.client.http.getDiscordLinks(clan.memberList);
		const dbMembers = await this.client.db
			.collection<UserInfoModel>(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: clan.memberList.map((m) => m.tag) } })
			.toArray();

		const members: { name: string; tag: string; userId: string; verified: boolean }[] = [];
		for (const m of memberTags) {
			const clanMember = clan.memberList.find((mem) => mem.tag === m.tag);
			if (!clanMember) continue;
			members.push({ tag: m.tag, userId: m.user, name: clanMember.name, verified: false });
		}

		if (dbMembers.length) this.updateUsers(interaction, dbMembers);
		for (const member of dbMembers) {
			for (const m of member.entries) {
				const clanMember = clan.memberList.find((mem) => mem.tag === m.tag);
				if (!clanMember) continue;

				const mem = members.find((mem) => mem.tag === m.tag);
				if (mem) mem.verified = m.verified;
				else members.push({ tag: m.tag, userId: member.user, name: clanMember.name, verified: m.verified });
			}
		}

		const userIds = members.reduce<string[]>((prev, curr) => {
			if (!prev.includes(curr.userId)) prev.push(curr.userId);
			return prev;
		}, []);
		const guildMembers = await interaction.guild.members.fetch({ user: userIds });

		// Players linked and on the guild.
		const onDiscord = members.filter((mem) => guildMembers.has(mem.userId));
		// Linked to discord but not on the guild.
		const notInDiscord = members.filter((mem) => !guildMembers.has(mem.userId));
		// Not linked to discord.
		const notLinked = clan.memberList.filter(
			(m) => !notInDiscord.some((en) => en.tag === m.tag) && !members.some((en) => en.tag === m.tag && guildMembers.has(en.userId))
		);

		const embed = this.getEmbed(guildMembers, clan, showTags!, onDiscord, notLinked, notInDiscord);
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id }))
			)
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(EMOJIS.HASH)
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, showTags: true }))
			);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private getEmbed(
		guildMembers: Collection<string, GuildMember>,
		clan: Clan,
		showTag: boolean,
		onDiscord: { tag: string; userId: string; verified: boolean }[],
		notLinked: ClanMember[],
		notInDiscord: { name: string; tag: string; verified: boolean }[]
	) {
		const chunks = Util.splitMessage(
			[
				`${EMOJIS.DISCORD} **Players on Discord: ${onDiscord.length}**`,
				onDiscord
					.map((mem) => {
						const member = clan.memberList.find((m) => m.tag === mem.tag)!;
						const user = showTag
							? member.tag.padStart(12, ' ')
							: guildMembers.get(mem.userId)!.displayName.substring(0, 12).padStart(12, ' ');
						return { name: this.parseName(member.name), user, verified: mem.verified };
					})
					.sort((a, b) => this.localeSort(a, b))
					.map(({ name, user, verified }) => {
						return `${verified ? '**✓**' : '✘'} \`\u200e${name}\u200f\` \u200e \` ${user} \u200f\``;
					})
					.join('\n'),
				notInDiscord.length ? `\n${EMOJIS.WRONG} **Players not on Discord: ${notInDiscord.length}**` : '',
				notInDiscord
					.map((mem) => {
						const member = clan.memberList.find((m) => m.tag === mem.tag)!;
						const user: string = member.tag.padStart(12, ' ');
						return { name: this.parseName(member.name), user, verified: mem.verified };
					})
					.sort((a, b) => this.localeSort(a, b))
					.map(({ name, user, verified }) => {
						return `${verified ? '**✓**' : '✘'} \`\u200e${name}\u200f\` \u200e \` ${user} \u200f\``;
					})
					.join('\n'),
				notLinked.length ? `\n${EMOJIS.WRONG} **Players not Linked: ${notLinked.length}**` : '',
				notLinked
					.sort((a, b) => this.localeSort(a, b))
					.map((mem) => `✘ \`\u200e${this.parseName(mem.name)}\u200f\` \u200e \` ${mem.tag.padStart(12, ' ')} \u200f\``)
					.join('\n')
			]
				.filter((text) => text)
				.join('\n'),
			{ maxLength: 4096 }
		);

		const embed = new EmbedBuilder()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
			.setDescription(chunks[0]);
		if (chunks.length > 1) {
			embed.addFields(chunks.slice(1).map((chunk) => ({ name: '\u200b', value: chunk })));
		}

		return embed;
	}

	private parseName(name: string) {
		return Util.escapeBackTick(name).padEnd(15, ' ');
		// return name.replace(/[^\x00-\xF7]+/g, ' ').trim().padEnd(15, ' ');
	}

	private localeSort(a: { name: string }, b: { name: string }) {
		// return a.name.localeCompare(b.name);
		return a.name.replace(/[^\x00-\xF7]+/g, '').localeCompare(b.name.replace(/[^\x00-\xF7]+/g, ''));
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
