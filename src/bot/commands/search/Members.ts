import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { ORANGE_NUMBERS } from '../../util/NumEmojis';
import { STOP_REASONS } from '../../util/Constants';
import { Clan, PlayerItem } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Util } from '../../util/Util';

const roleIds: { [key: string]: number } = {
	member: 1,
	admin: 2,
	coLeader: 3,
	leader: 4
};

const roleNames: { [key: string]: string } = {
	member: 'Mem',
	admin: 'Eld',
	coLeader: 'Co',
	leader: 'Lead'
};

const PETS: { [key: string]: number } = {
	'L.A.S.S.I': 1,
	'Electro Owl': 2,
	'Mighty Yak': 3,
	'Unicorn': 4
};

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			aliases: ['members', 'member', 'mem', 'warweight', 'ww'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'ATTACH_FILES'],
			description: {
				content: 'Clan members with Town Halls and Heroes.',
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag', '--with']
		});
	}

	public *args(msg: Message): unknown {
		const sub = yield {
			flag: '--with',
			unordered: true,
			type: [
				['link-list', 'links', 'discord'],
				['trophies', 'trophy'],
				['roles', 'role'],
				['tags', 'tag']
			],
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: true,
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data, sub };
	}

	public async exec(message: Message, { data, sub }: { data: Clan; sub: string }) {
		if (['link-list', 'trophies'].includes(sub)) {
			return this.handler.runCommand(message, this.handler.modules.get(sub)!, { data });
		}

		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched.filter(res => res.ok).map(m => ({
			name: m.name, tag: m.tag,
			warPreference: m.warPreference === 'in',
			role: {
				id: roleIds[m.role ?? data.memberList.find(mem => mem.tag === m.tag)!.role],
				name: roleNames[m.role ?? data.memberList.find(mem => mem.tag === m.tag)!.role]
			},
			townHallLevel: m.townHallLevel,
			heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : [],
			pets: m.troops.filter(troop => troop.name in PETS)
				.sort((a, b) => PETS[a.name] - PETS[b.name])
		}));

		members.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setFooter(`Total ${fetched.length === data.members ? data.members : `${fetched.length}/${data.members}`}/50`)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'```',
				`TH BK AQ GW RC  ${'NAME'}`,
				members.map(
					mem => {
						const heroes = this.heroes(mem.heroes).map(hero => this.padStart(hero.level)).join(' ');
						return `${mem.townHallLevel.toString().padStart(2, ' ')} ${heroes}  \u200e${mem.name}`;
					}
				).join('\n'),
				'```'
			].join('\n'));

		if (sub === 'tags') {
			embed.setDescription([
				'```',
				`\u200e${'TAG'.padStart(10, ' ')}  ${'NAME'}`,
				members.map(mem => `\u200e${mem.tag.padStart(10, ' ')}  ${mem.name}`).join('\n'),
				'```'
			].join('\n'));
		}

		if (sub === 'roles') {
			const _members = [...members].sort((a, b) => b.role.id - a.role.id);
			embed.setDescription([
				'```',
				`\u200e ${'ROLE'.padEnd(4, ' ')}  ${'NAME'}`,
				_members.map(mem => `\u200e ${mem.role.name.padEnd(4, ' ')}  ${mem.name}`).join('\n'),
				'```'
			].join('\n'));
		}

		const [discord, download, warPref] = [
			this.client.uuid(message.author.id),
			this.client.uuid(message.author.id),
			this.client.uuid(message.author.id)
		];

		const components = [
			new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setLabel('Discord Links')
						.setCustomId(discord)
						.setStyle('SECONDARY')
						.setEmoji(EMOJIS.DISCORD)
				)
				.addComponents(
					new MessageButton()
						.setEmoji('📥')
						.setLabel('Download')
						.setCustomId(download)
						.setStyle('SECONDARY')
				),
			new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setEmoji(EMOJIS.CROSS_SWORD)
						.setLabel('War Preference')
						.setCustomId(warPref)
						.setStyle('SECONDARY')
				)
		];

		const msg = await message.util!.send({ embeds: [embed], components });
		const collector = msg.createMessageComponentCollector({
			filter: action => [discord, download, warPref].includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === discord) {
				await action.update({ components: [] });
				await this.handler.runCommand(message, this.handler.modules.get('link-list')!, { data });
			}

			if (action.customId === warPref) {
				const optedIn = members.filter(m => m.warPreference);
				const optedOut = members.filter(m => !m.warPreference);
				embed.setDescription([
					`**OPTED-IN ~ ${optedIn.length}**`,
					optedIn.map(
						m => `\u200e**✓** ${ORANGE_NUMBERS[m.townHallLevel]} \` ${Util.escapeBackTick(m.name).padEnd(15, ' ')} \u200f\``
					).join('\n'),
					'',
					`**OPTED-OUT ~ ${optedOut.length}**`,
					optedOut.map(
						m => `\u200e✘ ${ORANGE_NUMBERS[m.townHallLevel]} \` ${Util.escapeBackTick(m.name).padEnd(15, ' ')} \u200f\``
					).join('\n')
				].join('\n'));
				embed.setFooter(`War Preference (${optedIn.length}/${members.length})`);
				await action.update({ embeds: [embed], components: [] });
			}

			if (action.customId === download) {
				await action.update({ components: [] });
				return this.handler.runCommand(message, this.handler.modules.get('export-members')!, { tags: [data.tag] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(discord);
			this.client.components.delete(download);
			this.client.components.delete(warPref);
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private heroes(items: PlayerItem[]) {
		return Object.assign([
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' }
		], items);
	}

	private padStart(num: number | string) {
		return num.toString().padStart(2, ' ');
	}
}
