const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');

class WarlogCommand extends Command {
	constructor() {
		super('warlog', {
			aliases: ['warlog'],
			category: 'search',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows your clan war log.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setDescription(`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War Log is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/warlog?limit=10`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).then(res => res.json());

		const results = body.items.map(r => r.result);
		const oppnames = body.items.map(r => r.opponent.name);
		const opptags = body.items.map(r => r.opponent.tag);
		const endTimes = body.items.map(r => r.endTime);
		const warSizes = body.items.map(r => r.teamSize);
		const ourattacks = body.items.map(r => r.clan.attacks);
		const ourstars = body.items.map(r => r.clan.stars);
		const ourdes = body.items.map(r => r.clan.destructionPercentage);
		const oppstars = body.items.map(r => r.opponent.stars);
		const oppdes = body.items.map(r => r.opponent.destructionPercentage);

		let index = 0;
		for (const opp of oppnames) {
			if (!opp) {
				const size = warSizes[oppnames.indexOf(opp)];
				const our_attacks = ourattacks[oppnames.indexOf(opp)];
				const our_stars = ourstars[oppnames.indexOf(opp)];
				const our_destruct = ourdes[oppnames.indexOf(opp)];
				const EndTime = new Date(moment(endTimes[oppnames.indexOf(opp)]).toDate()).getTime();
				const time = this.format(Date.now() - EndTime);
				const opp_stars = oppstars[oppnames.indexOf(opp)];
				embed.addField(`**${(++index).toString().padStart(2, '0')} ${emoji.cwl} Clan War League**`, [
					`\u200b\u2002 \u2002${emoji.star_small} \`\u200e${this.padStart(our_stars)} / ${this.padEnd(opp_stars)}\` ${emoji.fire_small} ${our_destruct.toFixed(2)}%`,
					`\u2002 \u2002${emoji.users_small} \`\u200e${this.padStart(size)} / ${this.padEnd(size)}\u200f\`\u200e ${emoji.clock_small} ${time} ago ${emoji.attacksword} ${our_attacks}`
				]);
			} else {
				const opp_name = opp;
				const result = results[oppnames.indexOf(opp)].replace(/lose/g, 'Lost').replace(/win/g, 'Won').replace(/tie/g, 'Tied');
				const opp_tag = opptags[oppnames.indexOf(opp)];
				const size = warSizes[oppnames.indexOf(opp)];
				const our_attacks = ourattacks[oppnames.indexOf(opp)];
				const our_stars = ourstars[oppnames.indexOf(opp)];
				const our_destruct = ourdes[oppnames.indexOf(opp)];
				const EndTime = new Date(moment(endTimes[oppnames.indexOf(opp)]).toDate()).getTime();
				const time = this.format(Date.now() - EndTime);
				const opp_stars = oppstars[oppnames.indexOf(opp)];
				const opp_destruct = oppdes[oppnames.indexOf(opp)];
				embed.addField(`**${(++index).toString().padStart(2, '0')} ${this.result(result)} against ${this.name(opp_name)}**`, [
					`\u200b\u2002 \u2002${emoji.star_small} \`\u200e${this.padStart(our_stars)} / ${this.padEnd(opp_stars)}\u200f\`\u200e ${emoji.fire_small} ${our_destruct}% / ${opp_destruct}%`,
					`\u2002 \u2002${emoji.users_small} \`\u200e${this.padStart(size)} / ${this.padEnd(size)}\u200f\`\u200e ${emoji.clock_small} ${time} ago ${emoji.attacksword} ${our_attacks}`
				]);
			}
		}

		return message.util.send({ embed });
	}

	result(result) {
		if (result === 'Won') return `${emoji.ok} Won`;
		if (result === 'Lost') return `${emoji.wrong} Lost`;
		if (result === 'Tied') return '<:empty:699639532013748326> Tied ';
	}

	name(data) {
		return data.split('').slice(0, 10).join('');
	}

	padEnd(num) {
		return num.toString().padEnd(3, '\u2002');
	}

	padStart(num) {
		return num.toString().padStart(3, '\u2002');
	}

	format(time) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}
}

module.exports = WarlogCommand;
