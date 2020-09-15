const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { mongodb } = require('../../struct/Database');
const { emoji, townHallEmoji, heroEmoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');
const moment = require('moment');
const ms = require('ms');

const BADGES = {
	'DISCORD_EMPLOYEE': '<:staff:314068430787706880>',
	'DISCORD_PARTNER': '<:partner:314068430556758017>',
	'HYPESQUAD_EVENTS': '<:hypesquad_events:585765895939424258>',
	'BUGHUNTER_LEVEL_1': '<:bughunter:585765206769139723>',
	'HOUSE_BRAVERY': '<:bravery:585763004218343426>',
	'HOUSE_BRILLIANCE': '<:brilliance:585763004495298575>',
	'HOUSE_BALANCE': '<:balance:585763004574859273>',
	'EARLY_SUPPORTER': '<:supporter:585763690868113455> ',
	'TEAM_USER': false,
	'SYSTEM': false,
	'BUGHUNTER_LEVEL_2': '<:bughunter:585765206769139723>',
	'VERIFIED_BOT': false,
	'VERIFIED_DEVELOPER': '<:botdev:707231318857089136>'
};

class ProfileCommand extends Command {
	constructor() {
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
					id: 'member',
					type: 'member',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { member }) {
		const data = await this.getProfile(member.id);
		const clan = await this.getClan(member.id);

		const badges = Object.keys(BADGES).filter(badges => member.user.flags.serialize()[badges]);
		const emojis = badges.map(badge => BADGES[badge]).filter(b => b !== false);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${member.user.tag}`, member.user.displayAvatarURL());

		if (emojis.length) {
			embed.setDescription([
				`**Badge${emojis.length === 1 ? '' : 's'}**`,
				[...emojis].join(' ')
			]);
		}

		embed.setDescription([
			embed.description,
			'',
			'**Created**',
			`${moment(member.user.createdAt).format('MMMM DD, YYYY, kk:mm:ss')} (${ms(Date.now() - member.user.createdAt, { long: true })} ago)`
		]);

		let index = 0;
		const collection = [];
		if (clan) {
			const data = await this.client.coc.clan(clan.tag).catch(() => null);
			if (data) {
				embed.setDescription([
					embed.description,
					'',
					`${emoji.clan} [${data.name} (${clan.tag})](https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)})`,
					...[`${emoji.empty} Level ${data.clanLevel} ${emoji.users} ${data.members} Member${data.members === 1 ? '' : 's'}`]
				]);
			}
		}

		const otherTags = Resolver.players(member.id);
		if (!data?.tags?.length && !otherTags?.length) {
			embed.setDescription([
				embed.description,
				'',
				'No accounts are linked. Why not add some?'
			]);
			return message.util.send({ embed });
		}

		const tags = new Set([...data?.tags ?? [], ...otherTags]);
		for (const tag of tags.values()) {
			index += 1;
			const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
			});
			if (!res.ok) continue;
			const data = await res.json();

			collection.push({
				field: `${townHallEmoji[data.townHallLevel]} [${data.name} (${data.tag})](https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)})`,
				values: [this.heroes(data), this.clanName(data)].filter(a => a.length)
			});

			if (index === 25) break;
		}
		tags.clear();

		embed.setFooter(`${collection.length} Account${collection.length === 1 ? '' : 's'} Linked`, 'https://cdn.discordapp.com/emojis/658538492409806849.png');
		collection.map(a => embed.addField('\u200b', [a.field, ...a.values]));
		return message.util.send({ embed });
	}

	clanName(data) {
		if (!data.clan) return '';
		const clanRole = data.role.replace(/admin/g, 'Elder')
			.replace(/coLeader/g, 'Co-Leader')
			.replace(/member/g, 'Member')
			.replace(/leader/g, 'Leader');

		return `${emoji.clan} ${clanRole} of ${data.clan.name}`;
	}

	heroes(data) {
		if (!data.heroes) return '';
		return data.heroes.filter(hero => hero.village === 'home')
			.map(hero => `${heroEmoji[hero.name]} ${hero.level}`).join(' ');
	}

	async getProfile(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.findOne({ user: id });

		return data;
	}

	async getClan(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedclans')
			.findOne({ user: id });

		return data;
	}
}

module.exports = ProfileCommand;
