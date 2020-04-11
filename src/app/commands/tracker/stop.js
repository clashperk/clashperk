const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');
const admin = require('firebase-admin');

class StopCommand extends Command {
	constructor() {
		super('stop', {
			aliases: ['stop'],
			category: 'tracker',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Stops tracking for a clan.',
				usage: '<method> <tag>',
				examples: ['donationlog #8QU8J9LP', 'playerlog #8QU8J9LP', 'lastonline #8QU8J9LP']
			},
			args: [
				{
					id: 'log',
					type: ['donationlog', 'playerlog', ['lastonline', 'lastonlineboard']]
				},
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

	async exec(message, { log, clan }) {
		if (!log) {
			const prefix = this.handler.prefix(message);
			const embed = this.client.util.embed()
				.setAuthor('Invalid Use - No Method Selected')
				.setDescription([
					'Available Methods',
					'• donationlog `<tag>`',
					'• playerlog `<tag>`',
					'• lastonline `<tag>`',
					'',
					'Examples',
					`${prefix}stop donationlog #8QU8J9LP`,
					`${prefix}stop playerlog #8QU8J9LP`,
					`${prefix}stop lastonline #8QU8J9LP`
				]);
			return message.util.send({ embed });
		}

		if (log === 'doantionlog') {
			await clan.ref.update({
				donantionlog: admin.firestore.FieldValue.delete()
			});
		} else if (log === 'playerlog') {
			await clan.ref.update({
				memberlog: admin.firestore.FieldValue.delete()
			});
		} else if (log === 'lastonline') {
			await clan.ref.update({
				lastonline: admin.firestore.FieldValue.delete()
			});
		}

		this.client.tracker.delete(message.guild.id, clan.tag);
		const metadata = await clan.ref.get().then(snap => snap.data());
		if (metadata.donantionlog || metadata.memberlog || metadata.lastonline) {
			this.client.tracker.add(clan.tag, message.guild.id, metadata);
			this.client.tracker.push(metadata);
		} else {
			await clan.ref.delete();
		}

		return message.util.send({
			embed: {
				title: `Successfully deleted **${clan.name} (${clan.tag})**`,
				color: 5861569
			}
		});
	}
}

module.exports = StopCommand;
