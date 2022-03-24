import { GuildMember, CommandInteraction, MessageEmbed, Collection } from 'discord.js';
import RAW_TROOPS_DATA from '../../util/Troops';
import { Collections, Messages } from '../../util/Constants';
import Workbook from '../../struct/Excel';
import { Command } from '../../lib';
import { Player } from 'clashofclans.js';
import { Util } from '../../util';

const achievements = [
	'Gold Grab',
	'Elixir Escapade',
	'Heroic Heist',
	'Games Champion',
	'War League Legend',
	'Unbreakable',
	'Conqueror',
	'Siege Sharer',
	'Sharing is caring',
	'Friend in Need'
];

const PETS: { [key: string]: number } = {
	'L.A.S.S.I': 1,
	'Electro Owl': 2,
	'Mighty Yak': 3,
	'Unicorn': 4
};

export default class ExportClanMembersCommand extends Command {
	public constructor() {
		super('export-members', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		if (!this.client.patrons.get(interaction)) {
			const embed = new MessageEmbed()
				.setDescription(
					[
						'**Patron only Command**',
						'This command is only available on Patron servers.',
						'Visit https://patreon.com/clashperk for more details.'
					].join('\n')
				)
				.setImage('https://i.imgur.com/Uc5G2oS.png');
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}

		// TODO: Fix
		if (!interaction.deferred) await interaction.deferReply();

		const tags = args.tag?.split(/ +/g) ?? [];
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.findAll(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(Messages.SERVER.NO_CLANS_FOUND);
		if (!clans.length) {
			return interaction.editReply(Messages.SERVER.NO_CLANS_LINKED);
		}

		const _clans = await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)));
		const members = [];
		for (const clan of _clans.filter((res) => res.ok)) {
			const fetched = await this.client.http.detailedClanMembers(clan.memberList);
			const mems = fetched
				.filter((res) => res.ok)
				.map((m) => ({
					name: m.name,
					tag: m.tag,
					clan: clan.name,
					townHallLevel: m.townHallLevel,
					heroes: m.heroes.length ? m.heroes.filter((a) => a.village === 'home') : [],
					achievements: this.getAchievements(m),
					pets: m.troops.filter((troop) => troop.name in PETS).sort((a, b) => PETS[a.name] - PETS[b.name]),
					rushed: Number(this.rushedPercentage(m)),
					heroRem: Number(this.heroUpgrades(m)),
					labRem: Number(this.labUpgrades(m))
				}));

			members.push(...mems);
		}

		const memberTags = [];
		memberTags.push(...(await this.client.http.getDiscordLinks(members)));
		const dbMembers = await this.client.db
			.collection(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: members.map((m) => m.tag) } })
			.toArray();
		if (dbMembers.length) this.updateUsers(interaction, dbMembers);
		for (const member of dbMembers) {
			for (const m of member.entries) {
				if (!members.find((mem) => mem.tag === m.tag)) continue;
				if (memberTags.find((mem) => mem.tag === m.tag)) continue;
				memberTags.push({ tag: m.tag, user: member.user });
			}
		}
		let guildMembers = new Collection<string, GuildMember>();
		const fetchedMembers = await Promise.all(
			Util.chunk(memberTags, 100).map((members) => interaction.guild.members.fetch({ user: members.map((m) => m.user) }))
		);
		guildMembers = guildMembers.concat(...fetchedMembers);

		for (const mem of members) {
			const user = memberTags.find((user) => user.tag === mem.tag)?.user;
			// @ts-expect-error
			mem.user_tag = guildMembers.get(user)?.user.tag;
		}
		guildMembers.clear();

		members
			.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const buffer = await this.excel(members);
		return interaction.editReply({
			content: `**${interaction.guild.name} Members**`,
			files: [{ attachment: Buffer.from(buffer), name: 'clan_members.xlsx' }]
		});
	}

	private excel(members: any[]) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Member List');

		sheet.columns = [
			{ header: 'NAME', width: 16 },
			{ header: 'TAG', width: 16 },
			{ header: 'Discord', width: 16 },
			{ header: 'CLAN', width: 16 },
			{ header: 'Town-Hall', width: 10 },
			{ header: 'Rushed %', width: 10 },
			{ header: 'Lab Upgrades %', width: 10 },
			{ header: 'Hero Upgrades %', width: 10 },
			{ header: 'BK', width: 10 },
			{ header: 'AQ', width: 10 },
			{ header: 'GW', width: 10 },
			{ header: 'RC', width: 10 },
			{ header: 'L.A.S.S.I', width: 10 },
			{ header: 'Electro Owl', width: 10 },
			{ header: 'Mighty Yak', width: 10 },
			{ header: 'Unicorn', width: 10 },
			...achievements.map((header) => ({ header, width: 16 }))
		] as any[];

		sheet.getRow(1).font = { bold: true, size: 10 };
		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			members.map((m) => [
				m.name,
				m.tag,
				m.user_tag,
				m.clan,
				m.townHallLevel,
				m.rushed,
				m.labRem,
				m.heroRem,
				...m.heroes.map((h: any) => h.level).concat(Array(4 - m.heroes.length).fill('')),
				...m.pets.map((h: any) => h.level).concat(Array(4 - m.pets.length).fill('')),
				...m.achievements.map((v: any) => v.value)
			])
		);

		return workbook.xlsx.writeBuffer();
	}

	private getAchievements(data: Player) {
		return achievements.map((name) => ({ name, value: data.achievements.find((en) => en.name === name)?.value ?? 0 }));
	}

	private updateUsers(interaction: CommandInteraction, members: any[]) {
		for (const data of members) {
			const member = interaction.guild!.members.cache.get(data.user);
			if (member && data.user_tag !== member.user.tag) {
				this.client.resolver.updateUserTag(interaction.guild!, data.user);
			}
		}
	}

	private rushedPercentage(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		if (rem.total === 0) return 0;
		return (100 - (rem.levels * 100) / rem.total).toFixed(2);
	}

	private labUpgrades(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.category !== 'hero' && unit.village === 'home') {
					prev.levels += apiTroop?.level ?? 0;
					prev.total += unit.levels[data.townHallLevel - 1];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		if (rem.total === 0) return 0;
		return ((rem.levels * 100) / rem.total).toFixed(2);
	}

	private heroUpgrades(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.category === 'hero' && unit.village === 'home') {
					prev.levels += apiTroop?.level ?? 0;
					prev.total += unit.levels[data.townHallLevel - 1];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		if (rem.total === 0) return 0;
		return ((rem.levels * 100) / rem.total).toFixed(2);
	}

	private apiTroops(data: Player) {
		return [
			...data.troops.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'troop',
				village: u.village
			})),
			...data.heroes.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'hero',
				village: u.village
			})),
			...data.spells.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'spell',
				village: u.village
			}))
		];
	}
}
