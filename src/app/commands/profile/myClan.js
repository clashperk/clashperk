const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Profile = require('../../models/Profile');

const STATUS = {
	400: 'client provided incorrect parameters for the request.',
	403: 'access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'invalid tag, resource was not found.',
	429: 'request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'unknown error happened when handling the request.',
	503: 'service is temprorarily unavailable because of maintenance.'
};

class MyClanCommand extends Command {
	constructor() {
		super('my-clan', {
			aliases: ['my-clan'],
			category: 'profile',
			description: {
				content: 'Shows information about your clan.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			args: [
				{
					id: 'member',
					type: 'member',
					default: message => message.member
				}
			]
		});
	}

	async exec(message, { member }) {
		const profile = await Profile.findOne({
			where: {
				guild: message.guild.id,
				user: member.id
			}
		});

		if (!profile || !profile.clan_tag) return message.util.reply(`couldn\'t find a player linked to ${member.user.tag}`);

		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(profile.clan_tag)}`;
		const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
		const data = await res.json();

		if (!res.ok) return message.util.reply(STATUS[res.status]);

		let clan_type = '';
		if (data.type === 'inviteOnly') {
			clan_type = 'Invite Only';
		} else if (data.type === 'closed') {
			clan_type = 'Closed';
		} else if (data.type === 'open') {
			clan_type = 'Anybody Can Join';
		}

		const embed = new MessageEmbed()
			.setAuthor(`${member.user.tag} (${member.user.id})`, member.user.displayAvatarURL())
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.medium)
			.addField('Level', data.clanLevel, true)
			.addField('Members', data.members, true)
			.addField('Required Trophies', `<:trophyc:534753357399588874> ${data.requiredTrophies}`, true)
			.addField('Clan Type', clan_type, true)
			.addField('Clan Points', `<:trophyc:534753357399588874> ${data.clanPoints} <:versustrophies:549844310858661888> ${data.clanVersusPoints}`, true)
			.addField('War Log', data.isWarLogPublic ? 'Public' : 'Private', true)
			.addField('War Wins', data.warWins, true)
			.addField('Win Streak', data.warWinStreak, true)
			.addField('War Frequency', data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()), true)
			.addField('Location', data.location ? data.location.name : 'None', true)
			.addField('Description', data.description ? data.description : '\u200b');

		return message.util.send({ embed });
	}
}

module.exports = MyClanCommand;
