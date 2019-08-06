const { Command } = require('discord-akairo');
const Clans = require('../../model/Clans');

class StopCommand extends Command {
	constructor() {
		super('stop', {
			aliases: ['stop'],
			category: 'tracker',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Stops tracking for a clan.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			args: [
				{
					id: 'clan',
					type: async (msg, phrase) => {
						if (!phrase) return null;
						const tag = `@${phrase.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
						const data = await Clans.findOne(msg.guild.id, tag);
						if (!data) return null;
						return data;
					},
					prompt: {
						start: 'what is the clan tag?',
						retry: (msg, { phrase }) => `clan tag *${phrase}* not found!`
					}
				}
			]
		});
	}

	async exec(message, { clan }) {
		this.client.tracker.delete(message.guild.id, clan.tag);
		Clans.destroy(message.guild.id, clan.tag);
		return message.util.send({
			embed: {
				title: `Successfully deleted **${clan.name} (${clan.tag})**`,
				color: 5861569
			}
		});
	}
}

module.exports = StopCommand;
