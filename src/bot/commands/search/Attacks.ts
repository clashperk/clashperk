import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanAttacksCommand extends Command {
	public constructor() {
		super('attacks', {
			aliases: ['attacks'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows attacks and defense of all members.',
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched.filter(res => res.ok).map(m => ({
			name: m.name,
			tag: m.tag,
			attackWins: m.attackWins,
			defenseWins: m.defenseWins
		}));

		members.sort((a, b) => b.attackWins - a.attackWins);

		const getEmbed = () => {
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
				.setDescription([
					'```',
					`\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}`,
					members.map((member, i) => {
						const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
						const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
						const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
						return `${(i + 1).toString().padStart(2, ' ')}  ${attackWins}  ${defenseWins}  \u200e${name}`;
					}).join('\n'),
					'```'
				].join('\n'));

			return embed;
		};

		const embed = getEmbed();

		const customId = this.client.uuid(message.author.id);
		const button = new MessageButton()
			.setCustomId(customId)
			.setStyle('SECONDARY')
			.setLabel('Sort by Defense');
		const msg = await message.util!.send({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });

		const interaction = await msg.awaitMessageComponent({
			filter: action => action.customId === customId && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		}).catch(() => null);

		this.client.components.delete(customId);
		members.sort((a, b) => b.defenseWins - a.defenseWins);
		return interaction?.update({ embeds: [getEmbed()], components: [] });
	}
}
