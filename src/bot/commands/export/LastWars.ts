import { CommandInteraction } from 'discord.js';
import ms from 'ms';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { WarType } from './Wars.js';

export default class LastWarsExport extends Command {
	public constructor() {
		super('export-last-wars', {
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
		const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
		if (!clans) return;

		let num = Number(args.limit ?? 25);
		num = Math.min(100, num);
		const clanList = await this.client.http._getClans(clans);
		const memberList = clanList.map((clan) => clan.memberList.map((m) => ({ ...m, clan: clan.name }))).flat();

		const query: Record<string, string | number> = args.season ? { season: args.season } : {};
		if (args.war_type) {
			query.warType = args.war_type === 'cwl' ? WarType.CWL : WarType.REGULAR;
		} else {
			query.warType = WarType.REGULAR;
		}

		const members = [] as { name: string; tag: string; total: number; clan: string; date: Date }[];
		for (const clan of clans) {
			const data = await this.client.db
				.collection(Collections.CLAN_WARS)
				.aggregate<{ name: string; tag: string; total: number; clan: string; date: Date }>([
					{
						$match: {
							$or: [{ 'clan.tag': clan.tag }, { 'opponent.tag': clan.tag }],
							state: 'warEnded',
							...query
						}
					},
					{
						$sort: {
							_id: -1
						}
					},
					{
						$limit: num
					},
					{
						$set: {
							clan: {
								$cond: [{ $eq: ['$clan.tag', clan.tag] }, '$clan', '$opponent']
							}
						}
					},
					{
						$project: {
							member: '$clan.members',
							clan: '$clan.name',
							date: '$endTime'
						}
					},
					{
						$unwind: {
							path: '$member'
						}
					},
					{
						$sort: {
							date: -1
						}
					},
					{
						$group: {
							_id: '$member.tag',
							name: {
								$first: '$member.name'
							},
							tag: {
								$first: '$member.tag'
							},
							date: {
								$first: '$date'
							},
							total: {
								$sum: 1
							},
							clan: {
								$first: '$clan'
							}
						}
					},
					{
						$sort: {
							date: -1
						}
					}
				])
				.toArray();

			members.push(...data);
		}

		const _missing = memberList
			.filter((mem) => !members.find((m) => m.tag === mem.tag))
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				clan: m.clan,
				total: 0
			}));

		const _members = members
			.filter((mem) => memberList.find((m) => m.tag === mem.tag))
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				clan: m.clan,
				total: m.total,
				date: m.date,
				duration: ms(Date.now() - m.date.getTime())
			}));

		const rows: {
			name: string;
			tag: string;
			clan: string;
			total: number;
			date?: Date;
			duration?: string;
		}[] = [..._members, ..._missing];

		if (!rows.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const sheets: CreateGoogleSheet[] = [
			{
				columns: [
					{ name: 'Name', width: 160, align: 'LEFT' },
					{ name: 'Tag', width: 120, align: 'LEFT' },
					{ name: 'Clan', width: 160, align: 'LEFT' },
					{ name: 'Total Wars', width: 100, align: 'RIGHT' },
					{ name: 'Last War Date', width: 160, align: 'LEFT' },
					{ name: 'Duration', width: 160, align: 'LEFT' }
				],
				rows: rows.map((m) => [m.name, m.tag, m.clan, m.total, m.date, m.duration]),
				title: `All Clans`
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Last Played Wars]`, sheets);
		return interaction.editReply({ content: `**Last Played Wars (Last ${num})**`, components: getExportComponents(spreadsheet) });
	}
}
