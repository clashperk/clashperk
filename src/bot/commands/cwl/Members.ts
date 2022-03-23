import { Command } from '../../lib';
import { CommandInteraction, MessageEmbed, Util } from 'discord.js';
import { Player } from 'clashofclans.js';

export default class CWLMembersCommand extends Command {
	public constructor() {
		super('cwl-members', {
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows the full list of CWL participants.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const body = await this.client.http.clanWarLeague(clan.tag);
		if (body.statusCode === 504 || body.state === 'notInWar') {
			return interaction.editReply('**[504 Request Timeout] Your clan is still searching for opponent!**');
		}

		if (!body.ok) {
			const embed = new MessageEmbed()
				.setColor(3093046)
				.setAuthor({
					name: `${clan.name} (${clan.tag})`,
					iconURL: `${clan.badgeUrls.medium}`,
					url: `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clan.tag}`
				})
				.setThumbnail(clan.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return interaction.editReply({ embeds: [embed] });
		}

		const clanMembers = body.clans.find((_clan) => _clan.tag === clan.tag)!.members;
		const fetched = await this.client.http.detailedClanMembers(clanMembers);
		const memberList = fetched
			.filter((m) => m.ok)
			.map((m) => {
				return {
					name: m.name,
					tag: m.tag,
					townHallLevel: m.townHallLevel,
					heroes: m.heroes.length ? m.heroes.filter((a) => a.village === 'home') : []
				};
			});

		/* [[1, 4], [2], [3]].reduce((a, b) => {
			a.push(...b);
			return a;
		}, []);*/

		let members = '';
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag}) ~ ${memberList.length}`, iconURL: clan.badgeUrls.medium });

		for (const member of memberList.sort((a, b) => b.townHallLevel - a.townHallLevel)) {
			members += `\u200e${this.padStart(member.townHallLevel)} ${this.heroes(member.heroes)
				.map((x) => this.padStart(x.level))
				.join(' ')}  ${Util.escapeInlineCode(member.name)}`;
			members += '\n';
		}

		const header = `TH BK AQ GW RC  ${'PLAYER'}`;
		const result = this.split(members);
		if (Array.isArray(result)) {
			embed.setDescription(`\`\`\`\u200e${header}\n${result[0]}\`\`\``);
		}

		return interaction.editReply({ embeds: [embed] });
	}

	private heroes(items: Player['heroes']) {
		return Object.assign([{ level: '  ' }, { level: '  ' }, { level: '  ' }, { level: '  ' }], items);
	}

	private padStart(num: number | string) {
		return num.toString().padStart(2, ' ');
	}

	private split(content: string) {
		return Util.splitMessage(content, { maxLength: 2048 });
	}
}
