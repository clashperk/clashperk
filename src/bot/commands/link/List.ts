import {
	Collection,
	GuildMember,
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	User,
	ButtonInteraction,
	StringSelectMenuBuilder
} from 'discord.js';
import { APIClan, APIClanMember } from 'clashofclans.js';
import { BOT_MANAGER_HYPERLINK, Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { PlayerLinks } from '../../types/index.js';
import { MembersCommandOptions } from '../../util/CommandOptions.js';

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
		args: { tag?: string; show_tags?: boolean; user?: User; links?: boolean; with_options?: boolean }
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;
		if (!clan.members) return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));

		if (args.links) {
			if (!this.client.util.isManager(interaction.member)) {
				return interaction.followUp({
					content: `You are missing the **Manage Server** permission or the ${BOT_MANAGER_HYPERLINK} role to use this component.`,
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

		const payload = {
			cmd: this.id,
			tag: clan.tag,
			with_options: args.with_options
		};
		const customIds = {
			refresh: this.createId(payload),
			tag: this.createId({ ...payload, show_tags: !args.show_tags }),
			manage: this.createId({ ...payload, links: true }),
			option: this.createId({ ...payload, cmd: 'members', string_key: 'option' })
		};

		const embed = this.getEmbed(guildMembers, clan, args.show_tags!, onDiscord, notLinked, notInDiscord);
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.REFRESH).setCustomId(customIds.refresh))
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(args.show_tags ? EMOJIS.DISCORD : EMOJIS.HASH)
					.setCustomId(customIds.tag)
			)
			.addComponents(
				new ButtonBuilder().setStyle(ButtonStyle.Primary).setEmoji('🔗').setLabel('Manage').setCustomId(customIds.manage)
			);

		const menu = new StringSelectMenuBuilder()
			.setPlaceholder('Select an option!')
			.setCustomId(customIds.option)
			.addOptions(
				Object.values(MembersCommandOptions).map((option) => ({
					label: option.label,
					value: option.id,
					description: option.description,
					default: option.id === MembersCommandOptions.discord.id
				}))
			);

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
		return interaction.editReply({ embeds: [embed], components: args.with_options ? [row, menuRow] : [row] });
	}

	private getEmbed(
		guildMembers: Collection<string, GuildMember>,
		clan: APIClan,
		showTag: boolean,
		onDiscord: { tag: string; userId: string; verified: boolean }[],
		notLinked: APIClanMember[],
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

	private async updateLinksAndRoles(guildId: string) {
		const clans = await this.client.storage.find(guildId);
		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		for (const clan of clans) {
			const { body: data, res } = await this.client.http.getClan(clan.tag);
			if (!res.ok) continue;

			const links = await collection.find({ tag: { $in: data.memberList.map((mem) => mem.tag) } }).toArray();
			const unknowns = await this.client.http.getDiscordLinks(data.memberList);

			for (const { userId, tag } of unknowns) {
				if (links.find((mem) => mem.tag === tag && mem.userId === userId)) continue;
				const lastAccount = await collection.findOne({ userId }, { sort: { order: -1 } });

				const player =
					data.memberList.find((mem) => mem.tag === tag) ?? (await this.client.http.getPlayer(tag).then(({ body }) => body));
				if (!player?.name) continue;

				const user = await this.client.users.fetch(userId).catch(() => null);
				if (!user) continue;

				try {
					await collection.insertOne({
						userId: user.id,
						username: user.username,
						displayName: user.displayName,
						discriminator: user.discriminator,
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
