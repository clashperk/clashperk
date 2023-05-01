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
import { sheets_v4 } from 'googleapis';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import Google from '../../struct/Google.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS, HEROES, TOWN_HALLS } from '../../util/Emojis.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

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

		const collection: { field: string; values: string[] }[] = [];
		const playerTags = [...new Set([...players.map((en) => en.tag), ...otherTags])];
		const hideLink = Boolean(playerTags.length >= 12);
		const __players = await Promise.all(playerTags.map((tag) => this.client.http.player(tag)));

		const links: LinkData[] = [];
		__players.forEach((player, n) => {
			const tag = playerTags[n];
			if (player.statusCode === 404) this.deleteBanned(user.id, tag);
			if (!player.ok) return;

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
				townHallLevel: player.townHallLevel,
				role: player.role,
				internal: this.isLinked(players, tag) ? 'Yes' : 'No'
			});
		});

		embed.addFields(
			collection.slice(0, 25).map((a, i) => ({
				name: i === 0 ? `**Player Accounts [${playerTags.length}]**` : '\u200b',
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
		const columns = ['Name', 'Tag', 'Town Hall', 'Clan', 'Clan Tag', 'Clan Role', 'Verified', 'Internal'];

		const { spreadsheets } = Google.sheet();
		const spreadsheet = await spreadsheets.create({
			requestBody: {
				properties: {
					title: `${interaction.guild.name} [Last Played War Dates]`
				},
				sheets: [1].map((_, i) => ({
					properties: {
						sheetId: i,
						index: i,
						title: Util.escapeSheetName('Accounts'),
						gridProperties: {
							rowCount: Math.max(players.length + 1, 50),
							columnCount: Math.max(columns.length, 25),
							frozenRowCount: players.length ? 1 : 0
						}
					}
				}))
			},
			fields: 'spreadsheetId,spreadsheetUrl'
		});

		await Google.publish(spreadsheet.data.spreadsheetId!);

		const requests: sheets_v4.Schema$Request[] = [1].map((_, i) => ({
			updateCells: {
				start: {
					sheetId: i,
					rowIndex: 0,
					columnIndex: 0
				},
				rows: [
					{
						values: columns.map((value) => ({
							userEnteredValue: {
								stringValue: value
							},
							userEnteredFormat: {
								wrapStrategy: 'WRAP'
							}
						}))
					},
					...players.map((player) => ({
						values: [
							player.name,
							player.tag,
							player.townHallLevel,
							player.clan?.name,
							player.clan?.tag,
							roles[player.role!],
							player.verified,
							player.internal
						].map((value, rowIndex) => ({
							userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value },
							userEnteredFormat: {
								numberFormat: rowIndex === 4 && typeof value === 'number' ? { type: 'DATE_TIME' } : {},
								textFormat:
									value === 'No' || (typeof value === 'number' && value <= 0)
										? { foregroundColorStyle: { rgbColor: { red: 1 } } }
										: {}
							}
						}))
					}))
				],
				fields: '*'
			}
		}));

		const styleRequests: sheets_v4.Schema$Request[] = [1]
			.map((_, i) => [
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							startColumnIndex: 0,
							endColumnIndex: 2
						},
						cell: {
							userEnteredFormat: {
								horizontalAlignment: 'LEFT'
							}
						},
						fields: 'userEnteredFormat(horizontalAlignment)'
					}
				},
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							startColumnIndex: 2
						},
						cell: {
							userEnteredFormat: {
								horizontalAlignment: 'RIGHT'
							}
						},
						fields: 'userEnteredFormat(horizontalAlignment)'
					}
				},
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							endRowIndex: 1,
							startColumnIndex: 0
						},
						cell: {
							userEnteredFormat: {
								textFormat: { bold: true },
								verticalAlignment: 'MIDDLE'
							}
						},
						fields: 'userEnteredFormat(textFormat,verticalAlignment)'
					}
				},
				{
					updateDimensionProperties: {
						range: {
							sheetId: i,
							dimension: 'COLUMNS',
							startIndex: 0,
							endIndex: columns.length
						},
						properties: {
							pixelSize: 120
						},
						fields: 'pixelSize'
					}
				}
			])
			.flat();

		await spreadsheets.batchUpdate({
			spreadsheetId: spreadsheet.data.spreadsheetId!,
			requestBody: {
				requests: [...requests, ...styleRequests]
			}
		});

		return interaction.editReply({
			content: `**${user.tag} (${user.id})**`,
			components: getExportComponents(spreadsheet.data)
		});
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

interface LinkData {
	name: string;
	tag: string;
	clan?: { name?: string; tag?: string };
	townHallLevel: number;
	role?: string;
	verified: string;
	internal: string;
}
