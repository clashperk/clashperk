import { ClanWar, ClanWarAttack, ClanWarMember, WarClan } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder,
	User,
	escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { CallerCollection } from '../../types/index.js';
import { Collections, WarType } from '../../util/Constants.js';
import { EMOJIS, TOWN_HALLS, WHITE_NUMBERS } from '../../util/Emojis.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

const stars: Record<string, string> = {
	0: '☆☆☆',
	1: '★☆☆',
	2: '★★☆',
	3: '★★★'
};

export default class WarCommand extends Command {
	public constructor() {
		super('war', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			description: {
				content: ['Current or previous clan war details.', '', 'Get War ID from `warlog` command.']
			},
			defer: true
		});
	}

	// TODO : Args Parsing with last war id

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; war_id?: number; user?: User; attacks?: boolean; openBases?: boolean }
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		if (args.attacks && args.war_id) {
			const collection = this.client.db.collection(Collections.CLAN_WARS);
			const body = await collection.findOne({ id: args.war_id });
			if (!body) return interaction.followUp({ content: 'No war found with that ID.', ephemeral: true });

			const clan = body.clan.tag === args.tag ? body.clan : body.opponent;
			const opponent = body.clan.tag === args.tag ? body.opponent : body.clan;

			const em = this.attacks(interaction, { ...body, clan, opponent } as unknown as ClanWar);
			return interaction.followUp({ embeds: [em], ephemeral: true });
		}

		if (args.openBases && args.war_id) {
			const collection = this.client.db.collection(Collections.CLAN_WARS);
			const body = await collection.findOne({ id: args.war_id });
			if (!body) return interaction.followUp({ content: 'No war found with that ID.', ephemeral: true });

			const clan = body.clan.tag === args.tag ? body.clan : body.opponent;
			const opponent = body.clan.tag === args.tag ? body.opponent : body.clan;

			const em = await this.openBases(interaction, { ...body, clan, opponent } as unknown as ClanWar);
			return interaction.followUp({ embeds: [em], ephemeral: true });
		}

		if (args.war_id) return this.getWar(interaction, args.war_id, clan.tag);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

		if (!clan.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(clan.tag);
			if (res.ok) {
				// TODO: Fix
				return this.handler.exec(interaction, this.handler.modules.get('cwl-round')!, { tag: clan.tag });
			}
			embed.setDescription('Private War Log');
			return interaction.editReply({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(clan.tag);
		if (!body.ok) {
			return interaction.editReply('**504 Request Timeout!**');
		}
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(clan.tag);
			if (res.ok) {
				// TODO: Fix
				return this.handler.exec(interaction, this.handler.modules.get('cwl-round')!, { tag: clan.tag });
			}
			embed.setDescription(this.i18n('command.war.not_in_war', { lng: interaction.locale }));
			return interaction.editReply({ embeds: [embed] });
		}

		return this.sendResult(interaction, body);
	}

	private async getWar(interaction: CommandInteraction, id: number | string, tag: string) {
		const collection = this.client.db.collection(Collections.CLAN_WARS);
		const data =
			id === 'last'
				? await collection
						.find({
							$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
							warType: { $ne: WarType.CWL },
							state: 'warEnded'
						})
						.sort({ _id: -1 })
						.limit(1)
						.next()
				: await collection.findOne({ id: Number(id), $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }] });

		if (!data) {
			return interaction.editReply(this.i18n('command.war.no_war_id', { lng: interaction.locale }));
		}

		const clan = data.clan.tag === tag ? data.clan : data.opponent;
		const opponent = data.clan.tag === tag ? data.opponent : data.clan;
		// @ts-expect-error
		return this.sendResult(interaction, { ...data, clan, opponent });
	}

	private async sendResult(interaction: CommandInteraction<'cached'>, body: ClanWar) {
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

		if (body.state === 'preparation') {
			const startTimestamp = new Date(moment(body.startTime).toDate()).getTime();
			embed.setDescription(
				[
					'**War Against**',
					`\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					'Preparation',
					`War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
					'',
					'**War Size**',
					`${body.teamSize} vs ${body.teamSize}`
				].join('\n')
			);
		}

		if (body.state === 'inWar') {
			const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
			embed.setDescription(
				[
					'**War Against**',
					`\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					`Battle Day (${body.teamSize} vs ${body.teamSize})`,
					`End Time: ${Util.getRelativeTime(endTimestamp)}`,
					'',
					'**War Size**',
					`${body.teamSize} vs ${body.teamSize}`,
					'',
					'**War Stats**',
					`${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember)}`
				].join('\n')
			);
		}

		if (body.state === 'warEnded') {
			const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
			embed.setDescription(
				[
					'**War Against**',
					`\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					`War Ended (${body.teamSize} vs ${body.teamSize})`,
					`Ended: ${Util.getRelativeTime(endTimestamp)}`,
					'',
					'**War Stats**',
					`${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember)}`
				].join('\n')
			);
		}

		embed.addFields([
			{
				name: 'Rosters',
				value: [`\u200e${escapeMarkdown(body.clan.name)}`, `${this.count(body.clan.members)}`].join('\n')
			},
			{
				name: '\u200b',
				value: [`\u200e${escapeMarkdown(body.opponent.name)}`, `${this.count(body.opponent.members)}`].join('\n')
			}
		]);

		if (body.hasOwnProperty('id')) {
			// @ts-expect-error
			embed.setFooter({ text: `War ID #${body.id as number}` });
		}

		if (body.state === 'preparation') {
			return interaction.editReply({ embeds: [embed] });
		}

		const customIds = {
			download: this.client.uuid(interaction.user.id),
			attacks: this.client.uuid(interaction.user.id),
			defenses: this.client.uuid(interaction.user.id),
			openBases: this.client.uuid(interaction.user.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel('Attacks')
				.setEmoji(EMOJIS.SWORD)
				.setStyle(ButtonStyle.Primary)
				.setCustomId(customIds.attacks)
				.setDisabled(body.clan.attacks === 0),
			new ButtonBuilder()
				.setLabel('Defenses')
				.setEmoji(EMOJIS.SHIELD)
				.setStyle(ButtonStyle.Danger)
				.setCustomId(customIds.defenses)
				.setDisabled(body.opponent.attacks === 0)
		);
		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel('Open Bases')
				.setEmoji(EMOJIS.EMPTY_STAR)
				.setStyle(ButtonStyle.Secondary)
				.setCustomId(customIds.openBases),
			new ButtonBuilder().setLabel('Download').setEmoji('📥').setStyle(ButtonStyle.Secondary).setCustomId(customIds.download)
		);
		const msg = await interaction.editReply({ embeds: [embed], components: [row, row2] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.download && action.isButton()) {
				await action.update({ components: [] });
				await this.gSpread(action, body, msg.id);
			}

			if (action.customId === customIds.attacks) {
				const em = this.attacks(interaction, body);
				await action.reply({ embeds: [em] });
			}

			if (action.customId === customIds.defenses) {
				const em = this.attacks(interaction, { ...body, clan: body.opponent, opponent: body.clan });
				await action.reply({ embeds: [em] });
			}

			if (action.customId === customIds.openBases) {
				const em = await this.openBases(interaction, body);
				await action.reply({ embeds: [em] });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private count(members: ClanWarMember[] = []) {
		const reduced = members.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map((entry) => ({ level: Number(entry[0]), total: Number(entry[1]) }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map((chunks) => chunks.map((th) => `${TOWN_HALLS[th.level]}${WHITE_NUMBERS[th.total]}`).join(' '))
			.join('\n');
	}

	private chunk(items: { level: number; total: number }[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private async gSpread(interaction: ButtonInteraction<'cached'>, round: ClanWar, messageId: string) {
		const data = this.flatHits(round);

		const sheets: CreateGoogleSheet[] = [
			{
				columns: [
					{ name: 'NAME', width: 160, align: 'LEFT' },
					{ name: 'TAG', width: 120, align: 'LEFT' },
					{ name: 'STARS', width: 100, align: 'RIGHT' },
					{ name: 'TRUE STARS', width: 100, align: 'RIGHT' },
					{ name: 'DESTRUCTION', width: 100, align: 'RIGHT' },
					{ name: 'DEFENDER', width: 160, align: 'LEFT' },
					{ name: 'DEFENDER TAG', width: 120, align: 'LEFT' },
					{ name: 'ATTACKER MAP', width: 100, align: 'RIGHT' },
					{ name: 'ATTACKER TH', width: 100, align: 'RIGHT' },
					{ name: 'DEFENDER MAP', width: 100, align: 'RIGHT' },
					{ name: 'DEFENDER TH', width: 100, align: 'RIGHT' },
					{ name: 'DEFENSE STAR', width: 100, align: 'RIGHT' },
					{ name: 'DEFENSE DESTRUCTION', width: 100, align: 'RIGHT' }
				],
				rows: data.map((m) => [
					m.name,
					m.tag,
					m.attack?.stars,
					m.attack?.trueStars,
					this.toFixed(m.attack?.destructionPercentage),
					m.defender?.name,
					m.defender?.tag,
					m.mapPosition,
					m.townhallLevel,
					m.defender?.mapPosition,
					m.defender?.townhallLevel,
					m.bestOpponentAttack?.stars,
					this.toFixed(m.bestOpponentAttack?.destructionPercentage)
				]),
				title: `${round.clan.name} vs ${round.opponent.name}`
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [War Export]`, sheets);
		return interaction.editReply({
			message: messageId,
			content: `**War (${round.clan.name} vs ${round.opponent.name})**`,
			components: getExportComponents(spreadsheet)
		});
	}

	private toFixed(num: number) {
		if (!num) return num;
		return Number(num.toFixed(2));
	}

	private getLeaderBoard(clan: WarClan, opponent: WarClan, attacksPerMember: number) {
		const attacksTotal = Math.floor(clan.members.length * attacksPerMember);
		return [
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars
				.toString()
				.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.attacks}/${attacksTotal}`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
				EMOJIS.SWORD
			} \u2002 \`\u200e ${`${opponent.attacks}/${attacksTotal}`.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
				EMOJIS.FIRE
			} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
		].join('\n');
	}

	private flatHits(data: ClanWar) {
		const __attacks = data.clan.members.flatMap((m) => m.attacks ?? []);
		const members = data.clan.members.map((member) => {
			const attacks = (member.attacks ?? []).map((atk) => {
				const previousBestAttack = this.getPreviousBestAttack(__attacks, data.opponent, atk);
				return {
					...atk,
					trueStars: previousBestAttack ? Math.max(0, atk.stars - previousBestAttack.stars) : atk.stars
				};
			});

			return {
				...member,
				attacks
			};
		});

		return members
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.reduce<any[]>((previous, member) => {
				const atk = member.attacks.map((attack, num) => ({
					attack,
					tag: member.tag,
					name: member.name,
					mapPosition: member.mapPosition,
					townhallLevel: member.townhallLevel,
					bestOpponentAttack: num === 0 ? member.bestOpponentAttack : {},
					defender: data.opponent.members.find((m) => m.tag === attack.defenderTag)
				}));

				if (atk.length) {
					previous.push(...atk);
				} else {
					previous.push({
						tag: member.tag,
						name: member.name,
						mapPosition: member.mapPosition,
						townhallLevel: member.townhallLevel,
						bestOpponentAttack: member.bestOpponentAttack
					});
				}

				previous.push({});
				return previous;
			}, []);
	}

	private getPreviousBestAttack(attacks: ClanWarAttack[], opponent: WarClan, atk: ClanWarAttack) {
		const defender = opponent.members.find((m) => m.tag === atk.defenderTag)!;
		const defenderDefenses = attacks.filter((atk) => atk.defenderTag === defender.tag);
		const isFresh = defenderDefenses.length === 0 || atk.order === Math.min(...defenderDefenses.map((d) => d.order));
		const previousBestAttack = isFresh
			? null
			: [...attacks]
					.filter((_atk) => _atk.defenderTag === defender.tag && _atk.order < atk.order && _atk.attackerTag !== atk.attackerTag)
					.sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)
					.at(0) ?? null;
		return isFresh ? null : previousBestAttack;
	}

	private attacks(interaction: CommandInteraction, body: ClanWar) {
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

		embed.setDescription(
			[
				embed.data.description,
				'',
				`**Total Attacks - ${body.clan.attacks}/${body.teamSize * (body.attacksPerMember || 1)}**`,
				`**\u200e\` # TH ${stars[3]} DEST ${'NAME'.padEnd(15, ' ')}\u200f\`**`,
				body.clan.members
					.sort((a, b) => a.mapPosition - b.mapPosition)
					.map((member, n) => ({ ...member, mapPosition: n + 1 }))
					.filter((m) => m.attacks?.length)
					.map((member) => {
						return member
							.attacks!.map((atk, i) => {
								const n = i === 0 ? member.mapPosition.toString() : ' ';
								const th = i === 0 ? member.townhallLevel.toString() : ' ';
								const name = i === 0 ? member.name : ' ';

								return `\`\u200e${this.index(n)} ${th.padStart(2, ' ')} ${stars[atk.stars]} ${this.percentage(
									atk.destructionPercentage
								)}% ${this.padEnd(`${name}`)}\``;
							})
							.join('\n');
					})
					.join('\n')
			].join('\n')
		);

		return embed;
	}

	private toDate(ISO: string) {
		return new Date(moment(ISO).toDate());
	}

	private createId(data: ClanWar) {
		const ISO = this.toDate(data.preparationStartTime).toISOString().substring(0, 16);
		return `${ISO}-${[data.clan.tag, data.opponent.tag].sort((a, b) => a.localeCompare(b)).join('-')}`;
	}

	private async openBases(interaction: CommandInteraction, body: ClanWar) {
		const openBases = body.opponent.members
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map((member, n) => ({
				...member,
				mapPosition: n + 1,
				originalMapPosition: member.mapPosition,
				stars: member.bestOpponentAttack?.stars ?? 0,
				isOpen: body.attacksPerMember === 1 ? !member.bestOpponentAttack : member.bestOpponentAttack?.stars !== 3,
				destructionPercentage: member.bestOpponentAttack?.destructionPercentage ?? 0
			}))
			.filter((m) => m.isOpen);

		const callerData = await this.client.db
			.collection<CallerCollection>(Collections.WAR_BASE_CALLS)
			.findOne({ warId: this.createId(body), guild: interaction.guildId });
		const caller = callerData?.caller ?? {};

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });
		embed.setDescription(
			[
				embed.data.description,
				'',
				`**Enemy Clan Open Bases - ${openBases.length}/${body.teamSize}**`,
				`**\u200e\`${stars[3]} DEST  # TH ${'Caller'.padEnd(15, ' ')}\u200f\`**`,
				openBases
					.map((member) => {
						const n = member.mapPosition.toString();
						const map = this.index(n);
						const th = member.townhallLevel.toString().padStart(2, ' ');
						const dest = this.percentage(member.destructionPercentage);
						const key = `${member.tag}-${member.originalMapPosition}`;
						const callerName = this.padEnd(caller[key]?.note ?? ''); // eslint-disable-line
						return `\u200e\`${stars[member.stars]} ${dest}% ${map} ${th} ${callerName}\``;
					})
					.join('\n'),
				'',
				`Use ${this.client.getCommand('/caller assign')} command to assign a caller to a base.`
			].join('\n')
		);
		return embed;
	}

	private padEnd(name: string) {
		return Util.escapeBackTick(name).padEnd(15, ' ');
	}

	private index(num: number | string) {
		return num.toString().padStart(2, ' ');
	}

	private percentage(num: number) {
		return num.toString().padStart(3, ' ');
	}
}
