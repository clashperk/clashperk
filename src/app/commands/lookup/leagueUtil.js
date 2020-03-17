const { Command } = require('discord-akairo');
const { Util } = require('discord.js');
const { stripIndent } = require('common-tags');
const { leagueStrings } = require('../../util/constants');

class MembersLeagueCommand extends Command {
	constructor() {
		super('members-league-dec', {
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
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
		let members = '';

		for (const member of data.memberList) {
			members += `${leagueStrings[member.league.id]} **${member.name}** ${member.tag}\n`;
		}

		const split = stripIndent`<:clans:534765878118449152> **${data.name} (${data.tag}) ~ ${data.members}/50**
		\n${members}`;

		const result = this.break(split);
		const time = `*\u200b**Executed in ${((Date.now() - message.createdTimestamp) / 1000).toFixed(2)} sec**\u200b*`;
		if (Array.isArray(result)) {
			return result.map(async res => message.channel.send(result[0] === res ? time : '', {
				embed: {
					color: 0x5970c1,
					description: res
				}
			}));
		}
		return message.channel.send(time, {
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

// module.exports = MembersLeagueCommand;
