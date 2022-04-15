import { MessageEmbed, GuildMember, CommandInteraction } from 'discord.js';
import { EMOJIS, TOWN_HALLS, HEROES } from '../../util/Emojis';
import { Args, Command } from '../../lib';
import { Clan, Player } from 'clashofclans.js';
import { Collections } from '../../util/Constants';
import moment from 'moment';

export default class ProfileCommand extends Command {
	public constructor() {
		super('profile', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about linked accounts.'
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			user: {
				id: 'member',
				match: 'MEMBER'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { member?: GuildMember }) {
		const member = args.member ?? interaction.member;
		const data = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: member.id });

		if (data && data.user_tag !== member.user.tag) {
			this.client.resolver.updateUserTag(member.guild, member.id);
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${member.user.tag} (${member.user.id})`, iconURL: member.user.displayAvatarURL() })
			.setDescription(['**Created**', `${moment(member.user.createdAt).format('MMMM DD, YYYY, kk:mm:ss')}`].join('\n'));

		const clan: Clan = await this.client.http.clan(data?.clan?.tag ?? '💩');
		if (clan.statusCode === 503) {
			return interaction.editReply('**Service is temporarily unavailable because of maintenance.**');
		}

		if (clan.ok) {
			embed.setDescription(
				[
					embed.description,
					'',
					'**Clan**',
					`${EMOJIS.CLAN} [${clan.name} (${
						clan.tag
					})](https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)})`,
					...[`${EMOJIS.EMPTY} Level ${clan.clanLevel} ${EMOJIS.USERS} ${clan.members} Member${clan.members === 1 ? '' : 's'}`],
					'\u200b'
				].join('\n')
			);
		} else {
			embed.setDescription([embed.description, '\u200b'].join('\n'));
		}

		const otherTags = await this.client.http.getPlayerTags(member.id);
		if (!data?.entries?.length && !otherTags.length) {
			embed.setDescription([embed.description, 'No accounts are linked. Why not add some?'].join('\n'));
			return interaction.editReply({ embeds: [embed] });
		}

		let accounts = 0;
		const collection = [];
		const tags = new Set([...(data?.entries.map((en: any) => en.tag) ?? []), ...otherTags]);
		const hideLink = Boolean(tags.size >= 12);

		for (const tag of tags.values()) {
			const player: Player = await this.client.http.player(tag);
			if (player.statusCode === 404) this.deleteBanned(member.id, tag);
			if (!player.ok) continue;

			accounts += 1;
			const signature = this.isVerified(data, tag) ? EMOJIS.VERIFIED : this.isLinked(data, tag) ? EMOJIS.AUTHORIZE : '';
			collection.push({
				field: `${TOWN_HALLS[player.townHallLevel]} ${hideLink ? '' : '['}${player.name} (${player.tag})${
					hideLink ? '' : `](${this.profileURL(player.tag)})`
				} ${signature}`,
				values: [this.heroes(player), this.clanName(player)].filter((a) => a.length)
			});

			if (accounts === 25) break;
		}
		tags.clear();

		collection.map((a, i) =>
			embed.addField(i === 0 ? `**Player Accounts [${collection.length}]**` : '\u200b', [a.field, ...a.values].join('\n'))
		);

		const pop = () => {
			embed.fields.pop();
			if (embed.length > 6000) pop();
		};
		if (embed.length > 6000) pop();

		return interaction.editReply({ embeds: [embed] });
	}

	private isLinked(data: any, tag: string) {
		return Boolean(data?.entries.find((en: any) => en.tag === tag));
	}

	private isVerified(data: any, tag: string) {
		return Boolean(data?.entries.find((en: any) => en.tag === tag && en.verified));
	}

	private clanName(data: Player) {
		if (!data.clan) return '';
		const clanRole = data
			.role!.replace(/admin/g, 'Elder')
			.replace(/coLeader/g, 'Co-Leader')
			.replace(/member/g, 'Member')
			.replace(/leader/g, 'Leader');

		return `${EMOJIS.CLAN} ${clanRole} of ${data.clan.name}`;
	}

	private heroes(data: Player) {
		if (!data.heroes.length) return '';
		return data.heroes
			.filter((hero) => hero.village === 'home')
			.map((hero) => `${HEROES[hero.name]} ${hero.level}`)
			.join(' ');
	}

	private deleteBanned(user: string, tag: string) {
		this.client.http.unlinkPlayerTag(tag);
		return this.client.db.collection(Collections.LINKED_PLAYERS).updateOne({ user }, { $pull: { entries: { tag } } });
	}

	private profileURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(tag)}`;
	}
}
