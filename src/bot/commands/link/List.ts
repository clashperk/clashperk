import {
	Collection,
	GuildMember,
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	User,
	ButtonInteraction
} from 'discord.js';
import { Clan, ClanMember } from 'clashofclans.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { PlayerLinks } from '../../types/index.js';

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

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: { tag?: string; showTags?: boolean; user?: User; links?: boolean }
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;
		if (!clan.members) return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));

		if (args.links) {
			if (!this.client.util.isManager(interaction.member)) {
				return interaction.followUp({
					content: `You are missing the **Manage Server** permission or the **Bot Manager** role to use this component.`,
					ephemeral: true
				});
			}

			const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
			const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setURL(`https://clashperk.com/links?tag=${encodeURIComponent(clan.tag)}&token=${token}`)
					.setLabel('Open in Browser')
					.setStyle(ButtonStyle.Link)
			);
			await interaction.followUp({
				content: [`**Click the button below to manage Discord links on our Dashboard.**`].join('\n'),
				ephemeral: true,
				components: [linkRow]
			});
			return this.updateLinksAndRoles(interaction.guildId);
		}

		const users = await this.client.resolver.getLinkedUsersMap(clan.memberList);
		const members: { name: string; tag: string; userId: string; verified: boolean }[] = [];

		for (const mem of clan.memberList) {
			if (mem.tag in users) {
				const user = users[mem.tag];
				members.push({ tag: mem.tag, userId: user.userId, name: mem.name, verified: user.verified });
			}
		}

		// const memberTags = await this.client.http.getDiscordLinks(clan.memberList);
		// const dbMembers = await this.client.db
		// 	.collection<PlayerLinks>(Collections.PLAYER_LINKS)
		// 	.find({ tag: { $in: clan.memberList.map((m) => m.tag) } })
		// 	.toArray();

		// for (const m of memberTags) {
		// 	const clanMember = clan.memberList.find((mem) => mem.tag === m.tag);
		// 	if (!clanMember) continue;
		// 	members.push({ tag: m.tag, userId: m.userId, name: clanMember.name, verified: false });
		// }

		// if (dbMembers.length) this.updateUsers(interaction, dbMembers);
		// for (const member of dbMembers) {
		// 	const clanMember = clan.memberList.find((mem) => mem.tag === member.tag);
		// 	if (!clanMember) continue;

		// 	const mem = members.find((mem) => mem.tag === member.tag);
		// 	if (mem) mem.verified = member.verified;
		// 	if (mem && member.userId !== mem.userId) mem.userId = member.userId;
		// 	else members.push({ tag: member.tag, userId: member.userId, name: clanMember.name, verified: member.verified });
		// }

		const userIds = [...new Set(members.map((mem) => mem.userId))];
		const guildMembers = await interaction.guild.members.fetch({ user: userIds });

		// Players linked and on the guild.
		const onDiscord = members.filter((mem) => guildMembers.has(mem.userId));
		// Linked to discord but not on the guild.
		const notInDiscord = members.filter((mem) => !guildMembers.has(mem.userId));
		// Not linked to discord.
		const notLinked = clan.memberList.filter(
			(m) => !notInDiscord.some((en) => en.tag === m.tag) && !members.some((en) => en.tag === m.tag && guildMembers.has(en.userId))
		);

		const embed = this.getEmbed(guildMembers, clan, args.showTags!, onDiscord, notLinked, notInDiscord);
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
			)
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setEmoji('🔗')
					.setLabel('Manage')
					.setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, links: true }))
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

	private updateUsers(interaction: CommandInteraction | ButtonInteraction, members: PlayerLinks[]) {
		for (const clan of members) {
			const member = interaction.guild!.members.cache.get(clan.userId);
			if (member && clan.username !== member.user.tag) {
				this.client.resolver.updateUserTag(interaction.guild!, clan.userId);
			}
		}
	}

	private async updateLinksAndRoles(guildId: string) {
		const clans = await this.client.storage.find(guildId);
		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		for (const clan of clans) {
			const data = await this.client.http.clan(clan.tag);
			if (!data.ok) continue;

			const links = await collection.find({ tag: { $in: data.memberList.map((mem) => mem.tag) } }).toArray();
			const unknowns = await this.client.http.getDiscordLinks(data.memberList);

			for (const { userId, tag } of unknowns) {
				if (links.find((mem) => mem.tag === tag && mem.userId === userId)) continue;
				const lastAccount = await collection.findOne({ userId }, { sort: { order: -1 } });

				const player = data.memberList.find((mem) => mem.tag === tag) ?? (await this.client.http.player(tag));
				if (!player.name) continue;

				const user = await this.client.users.fetch(userId).catch(() => null);
				if (!user) continue;

				try {
					await collection.insertOne({
						userId: user.id,
						username: user.tag,
						tag,
						name: player.name,
						verified: false,
						order: lastAccount?.order ? lastAccount.order + 1 : 0,
						createdAt: new Date()
					});
				} catch {}
			}
		}
	}
}
