const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

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
					type: async (msg, str) => {
						if (!str) return null;
						const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
						const ref = firestore.collection('tracking_clans').doc(`${msg.guild.id}${tag}`);
						const data = await ref.get().then(snap => snap.data());
						if (!data) return null;
						return { name: data.name, tag: data.tag, ref };
					},
					prompt: {
						start: 'What is the clan tag?',
						retry: (msg, { phrase }) => `Clan tag \`${phrase}\` not found!`
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { clan }) {
		this.client.tracker.delete(message.guild.id, clan.tag);
		await clan.ref.delete();
		return message.util.send({
			embed: {
				title: `Successfully deleted **${clan.name} (${clan.tag})**`,
				color: 5861569
			}
		});
	}
}

module.exports = StopCommand;
