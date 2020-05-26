const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');

class RemainingAttacksCommand extends Command {
	constructor() {
		super('remaining', {
			aliases: ['remaining', 'missing', 'missing-attacks', 'rem'],
			category: 'search',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about remaining attacks.',
				usage: '<clanTag> [--cwl/cwl]',
				examples: ['#8QU8J9LP', '8QU8J9LP --cwl', '#8QU8J9LP cwl'],
				fields: [{
					name: 'Flags',
					value: ['`--cwl` or `cwl` for cwl missing attacks.']
				}]
			},
			flags: ['--cwl', '-cwl', 'cwl']
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

		const cwl = yield {
			match: 'flag',
			flag: ['--cwl', '-cwl', 'cwl']
		};

		return { data, cwl };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, cwl }) {
		if (cwl) {
			const command = this.client.commandHandler.modules.get('cwl-missing');
			return this.client.commandHandler.runCommand(message, command, { data });
		}
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ↗`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setTitle(`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`)
			.setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War Log Is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`, {
			method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).then(res => res.json());

		if (body.state === 'preparation') {
			embed.setDescription('Preparation Day');
			return message.util.send({ embed });
		}

		if (body.state === 'notInWar') {
			embed.setDescription('Not In War');
			return message.util.send({ embed });
		}

		let missing = '';
		for (const member of this.short(body.clan.members)) {
			if (member.attacks && member.attacks.length === 2) continue;
			missing += `**${member.mapPosition}.** ${member.name} ${member.tag} ~ ${member.attacks ? 2 - member.attacks.length : 2} \n`;
		}
		embed.setDescription([
			'**Missing Attacks**',
			'',
			missing
		]);
		const endTime = new Date(moment(body.endTime).toDate()).getTime();
		embed.setFooter(`Ends in ${moment.duration(endTime - Date.now()).format('D [days], H [hours] m [minutes]')}`);

		return message.util.send({ embed });
	}

	short(items) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}
}

module.exports = RemainingAttacksCommand;
