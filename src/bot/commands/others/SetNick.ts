import { Message, GuildMember } from 'discord.js';
import { Command } from 'discord-akairo';
import { Player } from 'clashofclans.js';

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
					'**Extra**',
					'Must include "|" to add a prefix or suffix of the nickname.',
					'Prefix ends with "|" and Suffix starts with "|"',
					'',
					'For additional `[...extra]` usage refer to the examples below.'
				],
				usage: '<@user> <#PlayerTag> [...extra]',
				examples: ['@Suvajit #9Q92C8R20', '@Suvajit #9Q92C8R20 AH |', '@Suvajit #9Q92C8R20 | AH'],
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
			'type': 'member',
			'default': (msg: Message) => msg.member
		};

		const player = yield {
			type: (msg: Message, args: string) => this.client.resolver.resolvePlayer(msg, args || member?.id)
		};

		const txt = yield {
			type: 'string',
			match: 'rest'
		};

		return { txt, member, player };
	}

	public async exec(message: Message, { txt, member, player }: { txt?: string; member: GuildMember; player: Player }) {
		if (member.id !== message.author.id && !message.member!.permissions.has('MANAGE_NICKNAMES')) {
			return message.util!.send('You are missing `Manage Nicknames` permission to use this command.');
		}

		if (message.guild!.me!.roles.highest.position <= member.roles.highest.position || member.id === message.guild!.ownerID) {
			const own = member.id === message.author.id;
			return message.util!.send(`I do not have permission to change ${own ? 'your ' : ''}nickname${own ? '.' : ' of this member!'}`);
		}

		let name = player.name;
		if (txt?.length && txt.trim().startsWith('|')) {
			name = `${player.name} ${txt}`;
		} else if (txt?.length && txt.trim().endsWith('|')) {
			name = `${txt} ${player.name}`;
		}

		if (name.length > 31) {
			return message.util!.send('Nickname must be 31 or fewer in length.');
		}

		await member.setNickname(name, `Nickname set by ${message.author.tag}`);
		return message.util!.send(`Nickname set to **${name}**`);
	}
}
