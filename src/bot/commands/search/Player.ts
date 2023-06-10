import { Player, WarClan } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder,
	Guild,
	Message,
	StringSelectMenuBuilder,
	User,
	escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import fetch from 'node-fetch';
import { Args, Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { PlayerLinks } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS, HEROES, SIEGE_MACHINES, TOWN_HALLS } from '../../util/Emojis.js';
import { getExportComponents } from '../../util/Helper.js';
import { Season, Util } from '../../util/index.js';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

const weaponLevels: Record<string, string> = {
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵'
};

const warTypes: Record<string, string> = {
	1: 'REGULAR',
	2: 'FRIENDLY',
	3: 'CWL'
};

export default class PlayerCommand extends Command {
	public constructor() {
		super('player', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Player summary and some basic details.'
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			player_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	public async run(message: Message, { tag }: { tag: string }) {
		const data = await this.client.http.player(tag);
		if (!data.ok) return null;
		const embed = (await this.embed(message.guild!, data)).setColor(this.client.embed(message));
		return message.channel.send({
			embeds: [embed],
			allowedMentions: { repliedUser: false },
			reply: { messageReference: message, failIfNotExists: false }
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return;

		const customIds = {
			accounts: this.client.uuid(interaction.user.id),
			troops: this.client.uuid(interaction.user.id),
			upgrades: this.client.uuid(interaction.user.id),
			rushed: this.client.uuid(interaction.user.id),
			clan: this.client.uuid(interaction.user.id),
			export: this.client.uuid(interaction.user.id)
		};

		const embed = (await this.embed(interaction.guild, data)).setColor(this.client.embed(interaction));
		const players = data.user ? await this.getPlayers(data.user.id) : [];

		const options = players.map((op) => ({
			description: op.tag,
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setEmoji(EMOJIS.REFRESH)
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(JSON.stringify({ cmd: this.id, tag: args.tag ?? args.user?.id }))
			)
			.addComponents(new ButtonBuilder().setLabel('Units').setStyle(ButtonStyle.Primary).setCustomId(customIds.troops))
			.addComponents(new ButtonBuilder().setLabel('Upgrades').setStyle(ButtonStyle.Primary).setCustomId(customIds.upgrades))
			.addComponents(new ButtonBuilder().setLabel('Rushed').setStyle(ButtonStyle.Primary).setCustomId(customIds.rushed))
			.addComponents(new ButtonBuilder().setLabel('Export Wars').setStyle(ButtonStyle.Primary).setCustomId(customIds.export));

		const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId(customIds.accounts).setPlaceholder('Select an account!').addOptions(options)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: options.length > 1 ? [row, menu] : [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id
			// time: 5 * 60 * 1000
		});

		args.tag = data.tag;
		collector.on('collect', async (action) => {
			if (action.customId === customIds.accounts && action.isStringSelectMenu()) {
				await action.deferUpdate();
				const data = players.find((en) => en.tag === action.values.at(0))!;
				args.tag = data.tag;
				const embed = await this.embed(action.guild, data);
				embed.setColor(this.client.embed(action));
				await action.editReply({ embeds: [embed] });
			}
			if (action.customId === customIds.troops && action.isButton()) {
				await action.deferUpdate();
				return this.handler.exec(action, this.handler.modules.get('units')!, { tag: args.tag });
			}
			if (action.customId === customIds.upgrades && action.isButton()) {
				await action.deferUpdate();
				return this.handler.exec(action, this.handler.modules.get('upgrades')!, { tag: args.tag });
			}
			if (action.customId === customIds.rushed && action.isButton()) {
				await action.deferUpdate();
				return this.handler.exec(action, this.handler.modules.get('rushed')!, { tag: args.tag });
			}
			if (action.customId === customIds.export && action.isButton()) {
				await action.deferReply();
				await this.exportWars(action, data);
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async embed(guild: Guild, data: Player) {
		const aggregated = await this.client.db
			.collection(Collections.LAST_SEEN)
			.aggregate([
				{
					$match: {
						tag: data.tag
					}
				},
				{
					$project: {
						tag: '$tag',
						lastSeen: '$lastSeen'
					}
				}
			])
			.next();

		const lastSeen = aggregated?.lastSeen ? this.getLastSeen(aggregated.lastSeen) : 'Unknown';
		const clan = data.clan
			? `**Clan Info**\n${EMOJIS.CLAN} [${data.clan.name}](${this.clanURL(data.clan.tag)}) (${roles[data.role!]})\n`
			: '';

		const war = await this.getWars(data.tag);
		const warStats = `${EMOJIS.CROSS_SWORD} ${war.total} ${EMOJIS.SWORD} ${war.attacks} ${EMOJIS.STAR} ${war.stars} ${
			EMOJIS.THREE_STARS
		} ${war.starTypes.filter((num) => num === 3).length} ${EMOJIS.EMPTY_SWORD} ${war.of - war.attacks}`;
		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.league?.iconUrls.small ?? `https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`)
			.setDescription(
				[
					`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${EMOJIS.EXP} **${data.expLevel}** ${
						EMOJIS.TROPHY
					} **${data.trophies}** ${EMOJIS.WAR_STAR} **${data.warStars}**`
				].join('\n')
			);
		embed.addFields([
			{
				name: '**Season Stats**',
				value: [
					`**Donated**\n${EMOJIS.TROOPS_DONATE} ${data.donations} ${EMOJIS.UP_KEY}`,
					`**Received**\n${EMOJIS.TROOPS_DONATE} ${data.donationsReceived} ${EMOJIS.DOWN_KEY}`,
					`**Attacks Won**\n${EMOJIS.SWORD} ${data.attackWins}`,
					`**Defense Won**\n${EMOJIS.SHIELD} ${data.defenseWins}${war.total > 0 ? `\n**War Stats**\n${warStats}` : ''}`,
					`[View war attack history](https://app.clashperk.com/members/${encodeURIComponent(data.tag)})`,
					'\u200b\u2002'
				].join('\n')
			}
		]);
		embed.addFields([
			{
				name: '**Other Stats**',
				value: [
					`**Best Trophies**\n${EMOJIS.TROPHY} ${data.bestTrophies}`,
					`${clan}**Last Seen**\n${EMOJIS.CLOCK} ${lastSeen}`,
					'\u200b\u2002'
				].join('\n')
			}
		]);
		embed.addFields([
			{
				name: '**Achievement Stats**',
				value: [
					'**Total Loots**',
					[
						`${EMOJIS.GOLD} ${this.format(data.achievements.find((d) => d.name === 'Gold Grab')!.value)}`,
						`${EMOJIS.ELIXIR} ${this.format(data.achievements.find((d) => d.name === 'Elixir Escapade')!.value)}`,
						`${EMOJIS.DARK_ELIXIR} ${this.format(data.achievements.find((d) => d.name === 'Heroic Heist')!.value)}`
					].join(' '),
					`**Troops Donated**\n${EMOJIS.TROOPS_DONATE} ${data.achievements.find((d) => d.name === 'Friend in Need')!.value}`,
					`**Spells Donated**\n${EMOJIS.SPELL_DONATE} ${data.achievements.find((d) => d.name === 'Sharing is caring')!.value}`,
					`**Siege Donated**\n${SIEGE_MACHINES['Wall Wrecker']} ${
						data.achievements.find((d) => d.name === 'Siege Sharer')!.value
					}`,
					`**Attacks Won**\n${EMOJIS.SWORD} ${data.achievements.find((d) => d.name === 'Conqueror')!.value}`,
					`**Defense Won**\n${EMOJIS.SHIELD} ${data.achievements.find((d) => d.name === 'Unbreakable')!.value}`,
					`**CWL War Stars**\n${EMOJIS.STAR} ${data.achievements.find((d) => d.name === 'War League Legend')!.value}`,
					`**Clan Games Points**\n${EMOJIS.CLAN_GAMES} ${data.achievements.find((d) => d.name === 'Games Champion')!.value}`,
					`**Capital Gold Looted**\n${EMOJIS.CAPITAL_GOLD} ${
						data.achievements.find((d) => d.name === 'Aggressive Capitalism')?.value ?? 0
					}`,
					`**Capital Gold Contributed**\n${EMOJIS.CAPITAL_GOLD} ${
						data.achievements.find((d) => d.name === 'Most Valuable Clanmate')?.value ?? 0
					}`,
					'\u200b\u2002'
				].join('\n')
			}
		]);

		const heroes = data.heroes.filter((hero) => hero.village === 'home').map((hero) => `${HEROES[hero.name]} ${hero.level}`);
		embed.addFields([
			{ name: '**Heroes**', value: [`${heroes.length ? heroes.join(' ') : `${EMOJIS.WRONG} None`}`, '\u200b\u2002'].join('\n') }
		]);

		const user = await this.getLinkedUser(guild, data.tag);
		if (user) {
			embed.addFields([{ name: '**Discord**', value: user.mention ?? `${EMOJIS.OK} Connected` }]);
		} else {
			embed.addFields([{ name: '**Discord**', value: `${EMOJIS.WRONG} Not Found` }]);
		}

		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e9
			? `${(Math.abs(num) / 1.0e9).toFixed(2)}B`
			: // Six Zeroes for Millions
			Math.abs(num) >= 1.0e6
			? `${(Math.abs(num) / 1.0e6).toFixed(2)}M`
			: // Three Zeroes for Thousands
			Math.abs(num) >= 1.0e3
			? `${(Math.abs(num) / 1.0e3).toFixed(2)}K`
			: Math.abs(num).toFixed(2);
	}

	public async getPlayers(userId: string) {
		const players = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).find({ userId }).toArray();
		const others = await this.client.http.getPlayerTags(userId);

		const playerTagSet = new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]);

		return (
			await Promise.all(
				Array.from(playerTagSet)
					.slice(0, 25)
					.map((tag) => this.client.http.player(tag))
			)
		).filter((res) => res.ok);
	}

	private async getWars(tag: string) {
		const member = {
			tag,
			total: 0,
			of: 0,
			attacks: 0,
			stars: 0,
			dest: 0,
			defStars: 0,
			defDestruction: 0,
			starTypes: [] as number[],
			defCount: 0
		};

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.find({
				preparationStartTime: { $gte: Season.startTimestamp },
				$or: [{ 'clan.members.tag': tag }, { 'opponent.members.tag': tag }],
				state: { $in: ['inWar', 'warEnded'] }
			})
			.sort({ preparationStartTime: -1 })
			.toArray();

		for (const data of wars) {
			const clan: WarClan = data.clan.members.find((m: any) => m.tag === tag) ? data.clan : data.opponent;
			member.total += 1;
			for (const m of clan.members) {
				if (m.tag !== tag) continue;
				member.of += data.attacksPerMember;

				if (m.attacks) {
					member.attacks += m.attacks.length;
					member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
					member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
					member.starTypes.push(...m.attacks.map((atk) => atk.stars));
				}

				if (m.bestOpponentAttack) {
					member.defStars += m.bestOpponentAttack.stars;
					member.defDestruction += m.bestOpponentAttack.destructionPercentage;
					member.defCount += 1;
				}
			}
		}

		return member;
	}

	private getLastSeen(lastSeen: Date) {
		const timestamp = Date.now() - lastSeen.getTime();
		return timestamp <= 1 * 24 * 60 * 60 * 1000
			? 'Today'
			: timestamp <= 2 * 24 * 60 * 60 * 1000
			? 'Yesterday'
			: `${ms(timestamp, { long: true })} ago`;
	}

	private async getLinkedUser(guild: Guild, tag: string) {
		const data = await Promise.any([this.getLinkedFromDb(tag), this.client.http.getLinkedUser(tag)]);
		if (!data) return null;

		const user = await guild.members.fetch(data.userId).catch(() => null);
		return { mention: user?.toString() ?? null, userId: data.userId };
	}

	private async getLinkedFromDb(tag: string) {
		const data = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).findOne({ tag });
		if (!data) return Promise.reject(0);
		return data;
	}

	private async exportWars(interaction: ButtonInteraction<'cached'>, player: Player) {
		const res = await fetch(`https://api.clashperk.com/wars/members/${encodeURIComponent(player.tag)}`, {
			headers: {
				Authorization: `Bearer ${this.client.util.createJWT()}`
			}
		});
		const data = (await res.json()) as { wars: WarHistory[] };
		const wars = data.wars
			.map((war) => {
				if (war.attacks.length) {
					return war.attacks.map((attack) => ({ ...war, attack }));
				}
				return [{ ...war }];
			})
			.flat();

		const sheets: CreateGoogleSheet[] = [
			{
				title: Util.escapeSheetName(`${player.name} (${player.tag})`),
				columns: [
					{ name: 'WAR TYPE', width: 100, align: 'LEFT' },
					{ name: 'CLAN', width: 160, align: 'LEFT' },
					{ name: 'OPPONENT', width: 160, align: 'LEFT' },
					{ name: 'DATE', width: 160, align: 'LEFT' },
					{ name: 'MAP POS', width: 100, align: 'RIGHT' },
					{ name: 'TOWN HALL', width: 100, align: 'RIGHT' },
					{ name: 'STARS', width: 100, align: 'RIGHT' },
					{ name: 'DESTRUCTION', width: 100, align: 'RIGHT' },
					{ name: 'OPPONENT MAP POS', width: 100, align: 'RIGHT' },
					{ name: 'OPPONENT TOWN HALL', width: 100, align: 'RIGHT' }
				],
				rows: wars.map((war) => [
					warTypes[war.warType],
					war.clan.name,
					war.opponent.name,
					moment(war.startTime).toDate(),
					war.attacker.mapPosition,
					war.attacker.townhallLevel,
					war.attack?.stars,
					war.attack?.destructionPercentage,
					war.attack?.defender.mapPosition,
					war.attack?.defender.townhallLevel
				])
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Attack History]`, sheets);
		return interaction.editReply({ components: getExportComponents(spreadsheet) });
	}
}

interface WarHistory {
	id: number;
	warType: number;
	startTime: string;
	endTime: string;
	clan: {
		name: string;
		tag: string;
	};
	opponent: {
		name: string;
		tag: string;
	};
	attacker: {
		name: string;
		tag: string;
		townhallLevel: number;
		mapPosition: number;
	};
	attacks: {
		stars: number;
		defenderTag: string;
		destructionPercentage: number;
		defender: {
			tag: string;
			townhallLevel: number;
			mapPosition: number;
		};
	}[];
	attack?: {
		stars: number;
		defenderTag: string;
		destructionPercentage: number;
		defender: {
			tag: string;
			townhallLevel: number;
			mapPosition: number;
		};
	};
}
