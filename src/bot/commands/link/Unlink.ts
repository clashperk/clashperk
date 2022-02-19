import { Command, PrefixSupplier } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';

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
					'• `unlink #PLAYER_TAG`',
					'',
					'• You must be a __Verified__ Co/Leader of the clan to unlink players for someone.'
				],
				usage: '<#ClanTag|#PlayerTag>',
				examples: ['#8QU8J9LP', '#9Q92C8R20', '#9Q92C8R20']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const tag = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.parseTag(tag)
		};

		return { tag };
	}

	public async exec(message: Message, { tag }: { tag: string }) {
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
				].join('\n'));

			return message.util!.send(
				{ embeds: [embed], content: '**You must provide a valid argument to run this command, check the examples and usage below.**' }
			);
		}

		const unlinked = await this.unlinkClan(message.author.id, tag);
		if (unlinked) return message.util!.send(`Successfully unlinked the clan tag **${tag}**`);

		const member = await this.getMember(tag, message);
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

		return message.util!.send(`Couldn't find this tag linked to **${member.tag}**`);
	}

	private async unlinkPlayer(user: string, tag: string) {
		const link = await this.client.http.unlinkPlayerTag(tag);
		const { value } = await this.client.db.collection<{ entries?: { tag: string }[] }>(Collections.LINKED_PLAYERS)
			.findOneAndUpdate({ user }, { $pull: { entries: { tag } } }, { returnDocument: 'before' });
		return value?.entries?.find(en => en.tag === tag) ? tag : link ? tag : null;
	}

	private async unlinkClan(user: string, tag: string): Promise<string | null> {
		const { value } = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.findOneAndUpdate({ user, 'clan.tag': tag }, { $unset: { clan: '' } }, { returnDocument: 'before' });
		return value?.clan.tag;
	}

	private parseTag(tag?: string) {
		return tag ? this.client.http.fixTag(tag) : null;
	}

	private async getMember(tag: string, message: Message) {
		const target = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
		return target
			? {
				id: target.user as string,
				tag: (target.user_tag ?? 'Unknown#0000') as string
			}
			: {
				id: message.author.id,
				tag: message.author.tag
			};
	}
}
