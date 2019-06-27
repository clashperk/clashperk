const { Command } = require('discord-akairo');
const { Util } = require('discord.js');
const { stripIndent } = require('common-tags');

const leagueStrings = {
	29000000: '<:no_league:524912313531367424>',
	29000001: '<:bronze3:524912314332348416>',
	29000002: '<:bronze2:524912314500251651>',
	29000003: '<:bronze1:524912313535561731>',
	29000004: '<:silver3:524912314680475659>',
	29000005: '<:silver2:524104101043372033>',
	29000006: '<:silver1:524102934871670786>',
	29000007: '<:gold3:524102875505229835>',
	29000008: '<:gold2:524102825589080065>',
	29000009: '<:gold1:524102616125276160>',
	29000010: '<:crystal3:525624971456937984>',
	29000011: '<:crystal2:524096411927576596>',
	29000012: '<:crystal1:524094240658292746>',
	29000013: '<:master3:524096647366705152>',
	29000014: '<:master2:524096587224580115>',
	29000015: '<:master1:524096526499446794>',
	29000016: '<:champion3:524093027099344907>',
	29000017: '<:champion2:524091846226345984>',
	29000018: '<:champion1:524091132498411520>',
	29000019: '<:titan3:524084656790962186>',
	29000020: '<:titan2:524089454206386199>',
	29000021: '<:titan1:524087152183607329>',
	29000022: '<:legend:524089797023760388>',
	29000023: '<:legend:524089797023760388>',
	29000024: '<:legend:524089797023760388>',
	29000025: '<:legend:524089797023760388>'
};

class MembersLeagueCommand extends Command {
	constructor() {
		super('members-league', {
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			cooldown: 20000,
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	async exec(message, { data, rank }) {
		const msg = await message.channel.send('**Making list of your clan members... <a:loading:538989228403458089>**');
		let members = '';

		for (const member of data.memberList) {
			members += `${leagueStrings[member.league.id]} **${member.name}** ${member.tag}\n`;
		}

		const split = stripIndent`<:clans:534765878118449152> **${data.name} (${data.tag})**

		${members}`;

		const result = this.break(split);
		await msg.edit(`*\u200b**Executed in ${((Date.now() - message.createdTimestamp) / 1000).toFixed(2)} sec**\u200b*`);
		if (Array.isArray(result)) {
			return result.map(async res => message.channel.send({
				embed: {
					color: 0x5970c1,
					description: res
				}
			}));
		}
		return message.channel.send({
			embed: {
				color: 0x5970c1,
				description: result
			}
		});
	}

	break(data) {
		return Util.splitMessage(data, { maxLength: 1900 });
	}
}

module.exports = MembersLeagueCommand;
