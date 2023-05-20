import { ClanWarAttack, WarClan } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';

export enum WarType {
	REGULAR = 1,
	FRIENDLY,
	CWL
}

export default class WarExport extends Command {
	public constructor() {
		super('export-wars', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { limit?: number; clans?: string; season?: string; war_type: string }
	) {
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		let num = Number(args.limit ?? 25);
		num = Math.min(100, num);
		const query = args.season ? { season: args.season } : {};
		const chunks = [];
		for (const { tag, name } of clans) {
			const wars = await this.client.db
				.collection(Collections.CLAN_WARS)
				.find({
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: { $in: ['inWar', 'warEnded'] },
					warType: args.war_type === 'friendly' ? WarType.FRIENDLY : WarType.REGULAR,
					...query
				})
				.sort({ _id: -1 })
				.limit(num)
				.toArray();

			const members: { [key: string]: any } = {};
			for (const war of wars) {
				const clan: WarClan = war.clan.tag === tag ? war.clan : war.opponent;
				const attacks = clan.members
					.filter((m) => m.attacks?.length)
					.map((m) => m.attacks!)
					.flat();

				for (const m of clan.members) {
					const member = members[m.tag]
						? members[m.tag]
						: (members[m.tag] = {
								name: m.name,
								tag: m.tag,
								attacks: 0,
								stars: 0,
								trueStars: 0,
								dest: 0,
								defStars: 0,
								starTypes: [],
								defCount: 0,
								of: 0,
								defDestruction: 0
						  });
					member.of += war.attacksPerMember;

					for (const atk of m.attacks ?? []) {
						const prev = this.freshAttack(attacks, atk.defenderTag, atk.order)
							? { stars: 0 }
							: this.getPreviousBestAttack(attacks, atk.defenderTag, atk.attackerTag);
						member.trueStars += Math.max(0, atk.stars - prev.stars);
					}

					if (m.attacks) {
						member.attacks += m.attacks.length;
						member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
						member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
						member.starTypes.push(...m.attacks.map((atk: any) => atk.stars));
					}

					if (m.bestOpponentAttack) {
						member.defStars += m.bestOpponentAttack.stars;
						member.defDestruction += m.bestOpponentAttack.destructionPercentage;
						member.defCount += 1;
					}
				}
			}

			chunks.push({
				name,
				tag,
				members: Object.values(members)
					.sort((a, b) => b.dest - a.dest)
					.sort((a, b) => b.stars - a.stars)
			});
		}

		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const sheets: CreateGoogleSheet[] = chunks.map((chunk) => ({
			columns: [
				{ name: 'Name', width: 160, align: 'LEFT' },
				{ name: 'Tag', width: 120, align: 'LEFT' },
				{ name: 'Total Attacks', width: 100, align: 'RIGHT' },
				{ name: 'Total Stars', width: 100, align: 'RIGHT' },
				{ name: 'Avg. Stars', width: 100, align: 'RIGHT' },
				{ name: 'True Stars', width: 100, align: 'RIGHT' },
				{ name: 'Avg. True Stars', width: 100, align: 'RIGHT' },
				{ name: 'Total Dest', width: 100, align: 'RIGHT' },
				{ name: 'Avg. Dest', width: 100, align: 'RIGHT' },
				{ name: 'Three Stars', width: 100, align: 'RIGHT' },
				{ name: 'Two Stars', width: 100, align: 'RIGHT' },
				{ name: 'One Stars', width: 100, align: 'RIGHT' },
				{ name: 'Zero Stars', width: 100, align: 'RIGHT' },
				{ name: 'Missed', width: 100, align: 'RIGHT' },
				{ name: 'Def Stars', width: 100, align: 'RIGHT' },
				{ name: 'Avg. Def Stars', width: 100, align: 'RIGHT' },
				{ name: 'Total Def Dest', width: 100, align: 'RIGHT' },
				{ name: 'Avg. Def Dest', width: 100, align: 'RIGHT' }
			],
			rows: chunk.members.map((m) => [
				m.name,
				m.tag,
				m.of,
				m.stars,
				Number((m.stars / m.of || 0).toFixed(2)),
				m.trueStars,
				Number((m.trueStars / m.of || 0).toFixed(2)),
				Number(m.dest.toFixed(2)),
				Number((m.dest / m.of || 0).toFixed(2)),
				this.starCount(m.starTypes, 3),
				this.starCount(m.starTypes, 2),
				this.starCount(m.starTypes, 1),
				this.starCount(m.starTypes, 0),
				m.of - m.attacks,
				m.defStars,
				Number((m.defStars / m.defCount || 0).toFixed()),
				Number(m.defDestruction.toFixed(2)),
				Number((m.defDestruction / m.defCount || 0).toFixed(2))
			]),
			title: `${chunk.name} (${chunk.tag})`
		}));

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [War Stats]`, sheets);
		return interaction.editReply({ content: `**War Export (Last ${num})**`, components: getExportComponents(spreadsheet) });
	}

	private starCount(stars: number[] = [], count: number) {
		return stars.filter((star) => star === count).length;
	}

	private getPreviousBestAttack(attacks: ClanWarAttack[], defenderTag: string, attackerTag: string) {
		return attacks
			.filter((atk) => atk.defenderTag === defenderTag && atk.attackerTag !== attackerTag)
			.sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)[0]!;
	}

	private freshAttack(attacks: ClanWarAttack[], defenderTag: string, order: number) {
		const hits = attacks.filter((atk) => atk.defenderTag === defenderTag).sort((a, b) => a.order - b.order);
		return hits.length === 1 || hits[0]!.order === order;
	}
}
