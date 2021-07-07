import { Message, GuildMember, MessageActionRow, MessageSelectMenu, Snowflake } from 'discord.js';
import { Argument, Command } from 'discord-akairo';
import { TOWN_HALLS } from '../../util/Emojis';

export default class SetNickNameCommand extends Command {
	public constructor() {
		super('setnick', {
			aliases: ['nick', 'setnick'],
			category: 'setup',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			description: {
				content: [
					'Sets nickname of a member in discord.',
					'',
					'Must include "|" to add a prefix or suffix of the nickname.',
					'Prefix ends with "|" and Suffix starts with "|"'
				],
				usage: '<@user> [...extra]',
				examples: ['@Suvajit', '@Suvajit AH |', '@Suvajit | AH'],
				image: {
					text: [
						'**More Examples**'
					],
					url: 'https://i.imgur.com/rrAK4uj.png'
				}
			}
		});
	}

	public *args(): unknown {
		const member = yield {
			type: Argument.union('member', (msg, id) => {
				if (!id) return null;
				if (!/^\d{17,19}/.test(id)) return null;
				return msg.guild!.members.fetch(id as Snowflake).catch(() => null);
			})
		};

		const txt = yield {
			type: 'string',
			match: 'rest'
		};

		return { txt, member };
	}

	public async exec(message: Message, { txt, member }: { txt?: string; member?: GuildMember }) {
		if (!member) {
			return message.util!.send('**You must mention a valid member to use this command.**');
		}

		if (member.id !== message.author.id && !message.member!.permissions.has('MANAGE_NICKNAMES')) {
			return message.util!.send('**You are missing `Manage Nicknames` permission to use this command.**');
		}

		if (message.guild!.me!.roles.highest.position <= member.roles.highest.position || member.id === message.guild!.ownerId) {
			const own = member.id === message.author.id;
			return message.util!.send(`**I do not have permission to change ${own ? 'your ' : ''}nickname${own ? '.' : ' of this member!**'}`);
		}

		const players = await this.client.links.getPlayers(member.user);
		if (!players.length) {
			return message.util!.send(`**No player accounts are linked to ${member.user.tag}**`);
		}

		const options = players.map(op => ({
			label: op.name, value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel],
			description: `${op.tag}`
		}));
		const customID = this.client.uuid();
		const row = new MessageActionRow()
			.addComponents(
				new MessageSelectMenu()
					.setCustomId(customID)
					.setPlaceholder('Select an account!')
					.addOptions(options)
			);

		const msg = await message.util!.send({ content: `**Setting up ${member.user.tag}\'s nickname...**`, components: [row] });
		const collector = msg.createMessageComponentCollector({
			filter: action => action.customId === customID && [member.id, message.author.id].includes(action.user.id),
			time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.isSelectMenu() && action.customId === customID) {
				const name = this.getName(options.find(opt => opt.value === action.values![0])!.label, txt);
				if (name.length > 31) {
					await action.reply({
						ephemeral: true,
						content: '**Nickname must be 31 or fewer in length.**'
					});
				} else {
					await member.setNickname(name, `Nickname set by ${message.author.tag}`).catch(() => null);

					row.components[0].setDisabled(true);
					return action.update({
						components: [row],
						content: `**${member.user.tag}\'s** nickname set to **${name}**`
					});
				}
			}
		});

		collector.on('end', () => {
			this.client.components.delete(customID);
			// if (msg.editable) await msg.edit({ components: [] });
		});
	}

	private getName(name: string, txt?: string) {
		if (txt?.length && txt.trim().startsWith('|')) {
			name = `${name} ${txt}`;
		} else if (txt?.length && txt.trim().endsWith('|')) {
			name = `${txt} ${name}`;
		}

		return name;
	}
}
