import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

const warTypes: Record<string, string> = {
	1: 'Regular',
	2: 'Friendly',
	3: 'CWL'
};

export default class ExportMissed extends Command {
	public constructor() {
		super('export-missed', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { limit?: number; clans?: string; season?: string }) {
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
		const chunks = [];
		const missed: { [key: string]: { name: string; tag: string; count: number; missed: Date[] } } = {};

		const query = args.season ? { season: args.season } : {};
		for (const { tag } of clans) {
			const wars = await this.client.db
				.collection(Collections.CLAN_WARS)
				.find({
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: 'warEnded',
					...query
				})
				.sort({ _id: -1 })
				.limit(num)
				.toArray();

			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent;
				const opponent = war.clan.tag === tag ? war.opponent : war.clan;
				for (const m of clan.members) {
					if (m.attacks?.length === war.attacksPerMember) continue;

					const _mem = missed[m.tag] // eslint-disable-line
						? missed[m.tag]
						: (missed[m.tag] = {
								name: m.name,
								tag: m.tag,
								missed: [] as Date[],
								count: war.attacksPerMember - (m.attacks?.length ?? 0)
						  });
					_mem.missed.push(war.endTime);

					const mem = {
						stars: [] as number[],
						name: m.name,
						warID: war.id,
						tag: m.tag,
						clan: clan.name,
						opponent: opponent.name,
						teamSize: war.teamSize,
						timestamp: new Date(war.endTime),
						missed: war.attacksPerMember - (m.attacks?.length ?? 0),
						warType: warTypes[war.warType]
					};

					if (!m.attacks) {
						mem.stars = [0, 0, 0, 0];
					}

					if (m.attacks?.length === 1) {
						mem.stars = m.attacks
							.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)])
							.flat()
							.concat(...[0, 0]);
					}

					if (m.attacks?.length === 2) {
						mem.stars = m.attacks.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)]).flat();
					}

					chunks.push(mem);
				}
			}
		}

		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const twoMissed = Object.values(missed).filter((m) => m.count === 2);
		const oneMissed = Object.values(missed).filter((m) => m.count === 1);

		const sheets: CreateGoogleSheet[] = [
			{
				title: Util.escapeSheetName('Missed Attacks'),
				columns: [
					{ name: 'Name', width: 160, align: 'LEFT' },
					{ name: 'Tag', width: 120, align: 'LEFT' },
					{ name: 'Clan', width: 160, align: 'LEFT' },
					{ name: 'Enemy Clan', width: 160, align: 'LEFT' },
					{ name: 'War ID', width: 100, align: 'RIGHT' },
					{ name: 'Ended', width: 160, align: 'LEFT' },
					{ name: 'War Type', width: 100, align: 'LEFT' },
					{ name: 'Team Size', width: 100, align: 'RIGHT' },
					{ name: 'Missed', width: 100, align: 'RIGHT' }
				],
				rows: chunks.map((m) => [m.name, m.tag, m.clan, m.opponent, m.warID, m.timestamp, m.warType, m.teamSize, m.missed])
			},
			{
				title: Util.escapeSheetName(`2 Missed Attacks`),
				columns: [
					{ name: 'Name', width: 160, align: 'LEFT' },
					{ name: 'Tag', width: 120, align: 'LEFT' },
					{ name: 'Miss #1', width: 160, align: 'LEFT' },
					{ name: 'Miss #2', width: 160, align: 'LEFT' },
					{ name: 'Miss #3', width: 160, align: 'LEFT' },
					{ name: 'Miss #4', width: 160, align: 'LEFT' },
					{ name: 'Miss #5', width: 160, align: 'LEFT' }
				],
				rows: twoMissed.map((m) => [m.name, m.tag, ...m.missed.map((m) => Util.dateToSerialDate(m)).slice(0, 5)])
			},
			{
				title: Util.escapeSheetName('1 Missed Attacks'),
				columns: [
					{ name: 'Name', width: 160, align: 'LEFT' },
					{ name: 'Tag', width: 120, align: 'LEFT' },
					{ name: 'Miss #1', width: 160, align: 'LEFT' },
					{ name: 'Miss #2', width: 160, align: 'LEFT' },
					{ name: 'Miss #3', width: 160, align: 'LEFT' },
					{ name: 'Miss #4', width: 160, align: 'LEFT' },
					{ name: 'Miss #5', width: 160, align: 'LEFT' }
				],
				rows: oneMissed.map((m) => [m.name, m.tag, ...m.missed.map((m) => m).slice(0, 5)])
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Missed Attacks]`, sheets);
		return interaction.editReply({ content: `**Missed Attacks (Last ${num})**`, components: getExportComponents(spreadsheet) });
	}
}
