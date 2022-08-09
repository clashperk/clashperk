import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { UserInfo } from '../../types/index.js';

export default class LinkDeleteCommand extends Command {
	public constructor() {
		super('link-delete', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Unlinks a clan or player account.',
					'',
					'You must be a __Verified__ Co/Leader of the clan to unlink players on behalf of someone.'
				]
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const tag = this.parseTag(args.tag);
		if (!tag) {
			return interaction.editReply(this.i18n('command.link.no_tag', { lng: interaction.locale }));
		}

		const unlinked = await this.unlinkClan(interaction.user.id, tag);
		if (unlinked) {
			return interaction.editReply(this.i18n('command.link.delete.success', { lng: interaction.locale, tag: `**${tag}**` }));
		}

		const member = await this.getMember(tag, interaction);
		if (interaction.user.id !== member.id) {
			const author = await this.client.db.collection<UserInfo>(Collections.LINKED_PLAYERS).findOne({ user: interaction.user.id });
			const accounts: string[] = author?.entries.filter((en) => en.verified).map((en) => en.tag) ?? [];
			if (!accounts.length) {
				return interaction.editReply(this.i18n('command.link.delete.no_access', { lng: interaction.locale }));
			}

			const data = await this.client.http.player(tag);
			if (!data.clan) {
				return interaction.editReply(this.i18n('command.link.delete.no_access', { lng: interaction.locale }));
			}

			const clan = await this.client.http.clan(data.clan.tag);
			if (!clan.memberList.find((mem) => ['leader', 'coLeader'].includes(mem.role) && accounts.includes(mem.tag))) {
				return interaction.editReply(this.i18n('command.link.delete.no_access', { lng: interaction.locale }));
			}
		}

		if (await this.unlinkPlayer(member.id, tag)) {
			return interaction.editReply(this.i18n('command.link.delete.success', { lng: interaction.locale, tag: `**${tag}**` }));
		}

		return interaction.editReply(this.i18n('command.link.delete.no_result', { lng: interaction.locale, tag: `**${tag}**` }));
	}

	private async unlinkPlayer(user: string, tag: string) {
		const link = await this.client.http.unlinkPlayerTag(tag);
		const { value } = await this.client.db
			.collection<{ entries?: { tag: string }[] }>(Collections.LINKED_PLAYERS)
			.findOneAndUpdate({ user }, { $pull: { entries: { tag } } }, { returnDocument: 'before' });
		return value?.entries?.find((en) => en.tag === tag) ? tag : link ? tag : null;
	}

	private async unlinkClan(user: string, tag: string): Promise<string | null> {
		const { value } = await this.client.db
			.collection(Collections.LINKED_PLAYERS)
			.findOneAndUpdate({ user, 'clan.tag': tag }, { $unset: { clan: '' } }, { returnDocument: 'before' });
		return value?.clan.tag;
	}

	private parseTag(tag?: string) {
		return tag ? this.client.http.fixTag(tag) : null;
	}

	private async getMember(tag: string, interaction: CommandInteraction<'cached'>) {
		const target = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
		return target
			? {
					id: target.user as string,
					tag: (target.user_tag ?? 'Unknown#0000') as string
			  }
			: {
					id: interaction.user.id,
					tag: interaction.user.tag
			  };
	}
}
