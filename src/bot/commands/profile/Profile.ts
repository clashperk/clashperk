import { MessageEmbed, GuildMember, Message } from 'discord.js';
import { EMOJIS, TOWN_HALLS, HEROES } from '../../util/Emojis';
import { COLLECTIONS } from '../../util/Constants';
import { Clan, Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';
import moment from 'moment';

export default class ProfileCommand extends Command {
	public constructor() {
		super('profile', {
			aliases: ['profile', 'whois', 'user'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about your linked accounts.',
				usage: '<member>',
				examples: ['', 'Suvajit', 'Reza', '@gop']
			},
			args: [
				{
					'id': 'member',
					'type': 'member',
					'default': (message: Message) => message.member
				}
			]
		});
	}

	public async exec(message: Message, { member }: { member: GuildMember }) {
		const player = await this.getProfile(member.id);
		const clan = await this.getClan(member.id);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${member.user.tag}`, member.user.displayAvatarURL());

		embed.setDescription([
			embed.description,
			'',
			'**Created**',
			`${moment(member.user.createdAt).format('MMMM DD, YYYY, kk:mm:ss')}`
		]);

		let index = 0;
		const collection = [];
		if (clan) {
			const data: Clan = await this.client.http.clan(clan.tag);
			if (data.ok) {
				embed.setDescription([
					embed.description,
					'',
					`${EMOJIS.CLAN} [${data.name} (${data.tag})](https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)})`,
					...[`${EMOJIS.EMPTY} Level ${data.clanLevel} ${EMOJIS.USERS} ${data.members} Member${data.members === 1 ? '' : 's'}`]
				]);
			}
		}

		const otherTags = this.client.resolver.players(member.id);
		if (!player?.tags?.length && !otherTags.length) {
			embed.setDescription([
				embed.description,
				'',
				'No accounts are linked. Why not add some?'
			]);
			return message.util!.send({ embed });
		}

		const tags = new Set([...player?.tags ?? [], ...otherTags]);
		for (const tag of tags.values()) {
			index += 1;
			const data: Player = await this.client.http.player(tag);
			if (data.statusCode === 404) {
				this.client.db.collection(COLLECTIONS.LINKED_USERS).updateOne({ user: member.id }, { $pull: { tags: tag } });
			}
			if (!data.ok) continue;

			collection.push({
				field: `${TOWN_HALLS[data.townHallLevel]} [${data.name} (${data.tag})](https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}) ${player?.tags?.includes(tag) ? EMOJIS.OK : ''}`,
				values: [this.heroes(data), this.clanName(data)].filter(a => a.length)
			});

			if (index === 25) break;
		}
		tags.clear();

		embed.setFooter(`${collection.length} Account${collection.length === 1 ? '' : 's'} Linked`, 'https://cdn.discordapp.com/emojis/658538492409806849.png');
		collection.map(a => embed.addField('\u200b', [a.field, ...a.values]));
		return message.util!.send({ embed });
	}

	private clanName(data: Player) {
		if (!data.clan) return '';
		const clanRole = data.role!.replace(/admin/g, 'Elder')
			.replace(/coLeader/g, 'Co-Leader')
			.replace(/member/g, 'Member')
			.replace(/leader/g, 'Leader');

		return `${EMOJIS.CLAN} ${clanRole} of ${data.clan.name}`;
	}

	private heroes(data: Player) {
		if (!data.heroes.length) return '';
		return data.heroes.filter(hero => hero.village === 'home')
			.map(hero => `${HEROES[hero.name]} ${hero.level}`).join(' ');
	}

	private getProfile(id: string) {
		return this.client.db.collection(COLLECTIONS.LINKED_USERS).findOne({ user: id });
	}

	private getClan(id: string) {
		return this.client.db.collection(COLLECTIONS.LINKED_CLANS).findOne({ user: id });
	}
}
