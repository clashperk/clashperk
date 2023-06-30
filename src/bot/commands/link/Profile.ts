import { Clan, Player } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	User
} from 'discord.js';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';
import { Collections, DOT } from '../../util/Constants.js';
import { EMOJIS, HEROES, TOWN_HALLS } from '../../util/Emojis.js';
import { getExportComponents } from '../../util/Helper.js';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	leader: 'Leader',
	coLeader: 'Co-Leader'
};

const weaponLevels: Record<string, string> = {
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵'
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

	public args(): Args {
		// const isOwner = this.client.isOwner(interaction.user.id);
		return {
			user: {
				id: 'user', // isOwner ? 'user' : 'member',
				match: 'USER' // isOwner ? 'USER' : 'MEMBER'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { member?: GuildMember; user?: User; player_tag?: string }) {
		const whitelist = this.client.settings.get<string[]>('global', 'whitelist', []);

		if (args.player_tag && !whitelist.includes(interaction.user.id)) {
			const command = this.handler.modules.get('player');
			return command!.exec(interaction, { tag: args.player_tag });
		}

		const user =
			args.player_tag && whitelist.includes(interaction.user.id)
				? await this.getUserByTag(interaction, args.player_tag)
				: args.user ?? (args.member ?? interaction.member).user;

		const [data, players] = await Promise.all([
			this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId: user.id }),
			this.client.db
				.collection<PlayerLinks>(Collections.PLAYER_LINKS)
				.find({ userId: user.id }, { sort: { order: 1 } })
				.toArray()
		]);

		if (
			data &&
			(data.username !== user.username || data.discriminator !== user.discriminator || data.displayName !== user.displayName)
		) {
			this.client.resolver.updateUserData(interaction.guild, user.id);
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${user.displayName} (${user.id})`, iconURL: user.displayAvatarURL() })
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
					'**Default Clan**',
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

		const collection: { field: string; values: string[] }[] = [];
		const playerTags = [...new Set([...players.map((en) => en.tag), ...otherTags])];
		const hideLink = Boolean(playerTags.length >= 12);
		const __players = await Promise.all(playerTags.map((tag) => this.client.http.player(tag)));
		const playerLinks = __players.filter((res) => res.ok);
		const defaultPlayer = playerLinks.at(0);

		__players.forEach((player, n) => {
			const tag = playerTags[n];
			if (player.statusCode === 404) {
				this.deleteBanned(user.id, tag);
			}
		});

		playerLinks.sort((a, b) => b.townHallLevel ** (b.townHallWeaponLevel ?? 1) - a.townHallLevel ** (a.townHallWeaponLevel ?? 1));
		playerLinks.sort((a, b) => this.heroSum(b) - this.heroSum(a));
		playerLinks.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const links: LinkData[] = [];
		playerLinks.forEach((player) => {
			const tag = player.tag;
			const isDefault = defaultPlayer?.tag === tag;

			const signature = this.isVerified(players, tag) ? '**✓**' : this.isLinked(players, tag) ? '' : '';
			const weaponLevel = player.townHallWeaponLevel ? weaponLevels[player.townHallWeaponLevel] : '';
			const townHall = `${TOWN_HALLS[player.townHallLevel]} ${player.townHallLevel}${weaponLevel}`;
			collection.push({
				field: `${townHall} ${DOT} ${hideLink ? '' : '['}${player.name} (${player.tag})${
					hideLink ? '' : `](${this.profileURL(player.tag)})`
				} ${signature} ${isDefault ? '**(Default)**' : ''}`,
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
				townHallLevel: player.townHallLevel,
				role: player.role,
				internal: this.isLinked(players, tag) ? 'Yes' : 'No'
			});
		});

		embed.addFields(
			collection.slice(0, 25).map((a, i) => ({
				name: i === 0 ? `**Player Accounts (${playerTags.length})**` : '\u200b',
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
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setEmoji(EMOJIS.EXPORT)
				.setCustomId(customIds.export)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(links.length < 5)
		);

		if (user.id === interaction.user.id) {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: 'optional' }))
					.setLabel('Link account')
					.setEmoji('🔗')
					.setStyle(ButtonStyle.Primary)
			);
		}

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000,
			max: 1
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.export && action.isButton()) {
				await action.deferReply();
				await this.export(action, links, user);
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

	private async getUserByTag(interaction: CommandInteraction<'cached'>, tag: string) {
		const link = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).findOne({ tag: this.client.http.fixTag(tag) });
		if (!link) return interaction.user;
		return this.client.users.fetch(link.userId).catch(() => interaction.user);
	}

	private async export(interaction: ButtonInteraction<'cached'>, players: LinkData[], user: User) {
		const sheets: CreateGoogleSheet[] = [
			{
				columns: [
					{ name: 'Name', width: 160, align: 'LEFT' },
					{ name: 'Tag', width: 120, align: 'LEFT' },
					{ name: 'Town Hall', width: 100, align: 'LEFT' },
					{ name: 'Clan', width: 160, align: 'LEFT' },
					{ name: 'Clan Tag', width: 100, align: 'LEFT' },
					{ name: 'Clan Role', width: 100, align: 'LEFT' },
					{ name: 'Verified', width: 100, align: 'LEFT' },
					{ name: 'Internal', width: 100, align: 'LEFT' }
				],
				rows: players.map((player) => [
					player.name,
					player.tag,
					player.townHallLevel,
					player.clan?.name,
					player.clan?.tag,
					roles[player.role!],
					player.verified,
					player.internal
				]),
				title: 'Accounts'
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Linked Accounts]`, sheets);
		return interaction.editReply({
			content: `**Linked Accounts [${user.displayName} (${user.id})]**`,
			components: getExportComponents(spreadsheet)
		});
	}

	private heroSum(player: Player) {
		return player.heroes.reduce((prev, curr) => {
			if (curr.village === 'builderBase') return prev;
			return curr.level + prev;
		}, 0);
	}

	private isLinked(players: PlayerLinks[], tag: string) {
		return Boolean(players.find((en) => en.tag === tag));
	}

	private isVerified(players: PlayerLinks[], tag: string) {
		return Boolean(players.find((en) => en.tag === tag && en.verified));
	}

	private clanName(player: Player) {
		if (!player.clan) return '';
		const warPref = player.warPreference === 'in' ? `${EMOJIS.WAR_PREF_IN}` : `${EMOJIS.WAR_PREF_OUT}`;
		return `${warPref} ${roles[player.role!]} of ${player.clan.name}`;
	}

	private heroes(data: Player) {
		if (!data.heroes.length) return '';
		const heroes = data.heroes
			.filter((hero) => hero.village === 'home')
			.map((hero) => `${HEROES[hero.name]} ${hero.level}`)
			.join(' ');
		return `${heroes}`;
	}

	private deleteBanned(userId: string, tag: string) {
		this.client.http.unlinkPlayerTag(tag);
		return this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).deleteOne({ userId, tag });
	}

	private profileURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(tag)}`;
	}
}

interface LinkData {
	name: string;
	tag: string;
	clan?: { name?: string; tag?: string };
	townHallLevel: number;
	role?: string;
	verified: string;
	internal: string;
}
