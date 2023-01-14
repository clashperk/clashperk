import {
	EmbedBuilder,
	GuildMember,
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	User,
	Interaction,
	ButtonStyle,
	ComponentType
} from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import moment from 'moment';
import { EMOJIS, TOWN_HALLS, HEROES } from '../../util/Emojis.js';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import Workbook from '../../struct/Excel.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	leader: 'Leader',
	coLeader: 'Co-Leader'
};

export default class ProfileCommand extends Command {
	public constructor() {
		super('profile', {
			aliases: ['whois'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			description: {
				content: 'Shows info about linked accounts.'
			},
			defer: true
		});
	}

	public args(interaction: Interaction): Args {
		const isOwner = this.client.isOwner(interaction.user.id);
		return {
			user: {
				id: isOwner ? 'user' : 'member',
				match: isOwner ? 'USER' : 'MEMBER'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { member?: GuildMember; user?: User }) {
		const user = args.user ?? (args.member ?? interaction.member).user;
		const [data, players] = await Promise.all([
			this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId: user.id }),
			this.client.db
				.collection<PlayerLinks>(Collections.PLAYER_LINKS)
				.find({ userId: user.id }, { sort: { order: 1 } })
				.toArray()
		]);

		if (data && data.username !== user.tag) {
			this.client.resolver.updateUserTag(interaction.guild, user.id);
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL() })
			.setDescription(['**Created**', `${moment(user.createdAt).format('MMMM DD, YYYY, kk:mm:ss')}`].join('\n'));

		const clan: Clan = await this.client.http.clan(data?.clan?.tag ?? '💩');
		if (clan.statusCode === 503) {
			return interaction.editReply('**Service is temporarily unavailable because of maintenance.**');
		}

		if (clan.ok) {
			embed.setDescription(
				[
					embed.data.description,
					'',
					'**Clan**',
					`${EMOJIS.CLAN} [${clan.name} (${
						clan.tag
					})](https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)})`,
					...[`${EMOJIS.EMPTY} Level ${clan.clanLevel} ${EMOJIS.USERS} ${clan.members} Member${clan.members === 1 ? '' : 's'}`],
					'\u200b'
				].join('\n')
			);
		} else {
			embed.setDescription([embed.data.description, '\u200b'].join('\n'));
		}

		const otherTags = await this.client.http.getPlayerTags(user.id);
		if (!players.length && !otherTags.length) {
			embed.setDescription([embed.data.description, 'No accounts are linked. Why not add some?'].join('\n'));
			return interaction.editReply({ embeds: [embed] });
		}

		const collection = [];
		const tags = new Set([...players.map((en) => en.tag), ...otherTags]);
		const hideLink = Boolean(tags.size >= 12);

		const links: XLSX[] = [];
		for (const tag of tags.values()) {
			const player: Player = await this.client.http.player(tag);
			if (player.statusCode === 404) this.deleteBanned(user.id, tag);
			if (!player.ok) continue;

			const signature = this.isVerified(players, tag) ? '**✓**' : this.isLinked(players, tag) ? '' : '';
			collection.push({
				field: `${TOWN_HALLS[player.townHallLevel]} ${hideLink ? '' : '['}${player.name} (${player.tag})${
					hideLink ? '' : `](${this.profileURL(player.tag)})`
				} ${signature}`,
				values: [this.heroes(player), this.clanName(player)].filter((a) => a.length)
			});

			links.push({
				name: player.name,
				tag: player.tag,
				verified: this.isVerified(players, tag) ? 'Yes' : 'No',
				clan: {
					name: player.clan?.name,
					tag: player.clan?.tag
				},
				role: player.role,
				external: this.isLinked(players, tag) ? 'No' : 'Yes'
			});
		}

		embed.addFields(
			collection.slice(0, 25).map((a, i) => ({
				name: i === 0 ? `**Player Accounts [${collection.length}]**` : '\u200b',
				value: [a.field, ...a.values].join('\n')
			}))
		);

		const embedLengthExceeded = () => {
			return embed.data.description!.length + embed.data.fields!.reduce((a, b) => a + b.name.length + b.value.length, 0) > 5900;
		};

		const popEmbed = () => {
			embed.data.fields!.pop();
			if (embedLengthExceeded()) popEmbed();
		};
		if (embedLengthExceeded()) popEmbed();

		const customIds = {
			export: this.client.uuid(interaction.user.id),
			sync: this.client.uuid(interaction.user.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setLabel('Sync Roles')
					.setCustomId(customIds.sync)
					.setStyle(ButtonStyle.Primary)
					.setDisabled(!links.length)
			)
			.addComponents(
				new ButtonBuilder()
					.setEmoji(EMOJIS.EXPORT)
					.setCustomId(customIds.export)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(links.length < 5)
			);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000,
			max: 1
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.export) {
				await action.deferReply();
				const file = await this.toXlsx(links, user);
				await action.editReply({
					content: `**${user.tag} (${user.id})**`,
					files: [{ attachment: Buffer.from(file), name: 'accounts.xlsx' }]
				});
			}
			if (action.customId === customIds.sync) {
				await action.reply({ ephemeral: true, content: 'Your roles will be updated shortly.', components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private toXlsx(data: XLSX[], user: User) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet(`${user.tag}`);
		sheet.columns = [
			{ header: 'Name', width: 18 },
			{ header: 'Tag', width: 18 },
			{ header: 'Clan', width: 18 },
			{ header: 'Clan Tag', width: 18 },
			{ header: 'Clan Role', width: 18 },
			{ header: 'Verified', width: 18 },
			{ header: 'External', width: 18 }
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}
		sheet.addRows(data.map((en) => [en.name, en.tag, en.clan?.name, en.clan?.tag, roles[en.role!], en.verified, en.external]));
		return workbook.xlsx.writeBuffer();
	}

	private isLinked(players: PlayerLinks[], tag: string) {
		return Boolean(players.find((en) => en.tag === tag));
	}

	private isVerified(players: PlayerLinks[], tag: string) {
		return Boolean(players.find((en) => en.tag === tag && en.verified));
	}

	private clanName(data: Player) {
		if (!data.clan) return '';
		return `${EMOJIS.CLAN} ${roles[data.role!]} of ${data.clan.name}`;
	}

	private heroes(data: Player) {
		if (!data.heroes.length) return '';
		return data.heroes
			.filter((hero) => hero.village === 'home')
			.map((hero) => `${HEROES[hero.name]} ${hero.level}`)
			.join(' ');
	}

	private deleteBanned(userId: string, tag: string) {
		this.client.http.unlinkPlayerTag(tag);
		return this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).deleteOne({ userId, tag });
	}

	private profileURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(tag)}`;
	}
}

interface XLSX {
	name: string;
	tag: string;
	clan?: { name?: string; tag?: string };
	role?: string;
	verified: string;
	external: string;
}
