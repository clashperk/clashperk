import { Command, PrefixSupplier, Argument } from 'discord-akairo';
import { Message, MessageEmbed, GuildMember } from 'discord.js';
import { Collections } from '@clashperk/node';

export default class UnlinkCommand extends Command {
	public constructor() {
		super('link-remove', {
			aliases: ['unlink'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Unlinks a clan or player account.',
					'',
					'• **Unlink Clan Tag**',
					'• `unlink #CLAN_TAG`',
					'',
					'• **Unlink Player Tag**',
					'• `unlink #PLAYER_TAG` (Self)',
					'',
					'• **On behalf of the @USER**',
					'• `unlink #PLAYER_TAG @USER`',
					'',
					'• You must be a __Verified__ Co/Leader of the clan to unlink players for someone.'
				],
				usage: '<#ClanTag|#PlayerTag>',
				examples: ['#8QU8J9LP', '#9Q92C8R20']
			},
			optionFlags: ['--tag', '--user']
		});
	}

	public *args(msg: Message): unknown {
		const tag = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.parseTag(tag)
		};

		const member = yield {
			'flag': '--user',
			'default': (msg: Message) => msg.member,
			'match': msg.hasOwnProperty('token') ? 'option' : 'rest',
			'type': Argument.union('member', (msg, id) => {
				if (!id) return null;
				if (!/^\d{17,19}/.test(id)) return null;
				return msg.guild!.members.fetch(id).catch(() => null);
			})
		};

		return { tag, member };
	}

	public async exec(message: Message, { member, tag }: { tag: string; member: GuildMember }) {
		if (!tag) {
			const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setDescription([
					`\`${prefix}unlink ${this.description.usage as string}\``,
					'',
					this.description.content.join('\n'),
					'',
					'**Examples**',
					this.description.examples.map((en: string) => `\`${prefix}unlink ${en}\``).join('\n')
				]);

			return message.util!.send(
				'**You must provide a valid argument to run this command, check the examples and usage below.**',
				{ embed }
			);
		}

		const unlinked = await this.unlinkClan(message.author.id, tag);
		if (unlinked) {
			return message.util!.send(`Successfully unlinked the clan tag **${tag}**`);
		}

		if (message.author.id !== member.id) {
			const author = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: message.author.id });
			const accounts: string[] = author?.entries?.filter((en: any) => en.verified).map((en: any) => en.tag) ?? [];
			if (!accounts.length) {
				return message.util!.send('**You must be a __Verified__ Co/Leader of a clan to perform this action.**');
			}

			const data = await this.client.http.player(tag);
			if (!data.clan) {
				return message.util!.send(
					'**This player must be in your clan and you must be a __Verified__ Co/Leader to perform this action.**'
				);
			}

			const clan = await this.client.http.clan(data.clan.tag);
			if (!clan.memberList.find(mem => ['leader', 'coLeader'].includes(mem.role) && accounts.includes(mem.tag))) {
				return message.util!.send('**You must be a __Verified__ Co/Leader of the clan to perform this action.**');
			}
		}

		if (await this.unlinkPlayer(member.id, tag)) {
			return message.util!.send(`Successfully unlinked the player tag **${tag}**`);
		}

		return message.util!.send(`Couldn't find this tag linked to **${member.user.tag}**`);
	}

	private async unlinkPlayer(user: string, tag: string) {
		const link = await this.client.http.unlinkPlayerTag(tag);
		const data = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.findOneAndUpdate(
				{ user }, { $pull: { entries: { tag } } }
			);
		return data.value?.entries?.includes(tag) ? tag : link ? tag : null;
	}

	private async unlinkClan(user: string, tag: string): Promise<string | null> {
		const clan = await this.client.db.collection(Collections.LINKED_CLANS).findOneAndDelete({ user, tag });
		return clan.value?.tag;
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null;
	}
}
