const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore } = require('../../struct/Database');

class EditCommand extends Command {
	constructor() {
		super('edit', {
			aliases: ['edit', 'edit-color'],
			category: 'tracker',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Edits the color of Embed for a clan.',
				usage: '<tag> <color>',
				examples: ['#2Q98URCGY #8387db']
			}
		});
	}

	*args() {
		const clan = yield {
			type: async (msg, str) => {
				if (!str) return null;
				const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
				const ref = await firestore.collection('tracking_clans').doc(`${msg.guild.id}${tag}`);
				const data = await ref.get().then(snap => snap.data());
				if (!data) return null;
				return { name: data.name, tag: data.tag, ref };
			},
			prompt: {
				start: 'What is the clan tag?',
				retry: (msg, { phrase }) => `Clan tag \`${phrase}\` not found!`
			}
		};
		const color = yield {
			type: 'color',
			prompt: {
				start: 'What\'s the color you want to apply to this clan?',
				retry: 'Please provide a valid hex color!'
			}
		};
		const confirm = yield {
			match: 'none',
			type: (msg, phrase) => {
				if (!phrase) return null;
				if (/^y(?:e(?:a|s)?)?$/i.test(phrase)) return true;
				return null;
			},
			prompt: {
				modifyStart: msg => {
					const content = 'Would you like to set this color? (Y/N)';
					const embed = new MessageEmbed()
						.setColor(color)
						.setAuthor(`${msg.author.tag} (${msg.author.id})`, msg.author.displayAvatarURL())
						.setTitle(`${clan.name} (${clan.tag})`)
						.setTimestamp();
					return { embed, content };
				},
				time: 10000,
				retries: 0,
				ended: new MessageEmbed().setAuthor('Command has been cancelled.').setColor(3093046)
			}
		};

		return { clan, color, confirm };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { clan, color }) {
		await clan.ref.update({ color }, { merge: true });
		this.client.tracker.add(clan.tag, message.guild.id, clan.channel, color);
		return message.util.send({
			embed: {
				author: { name: 'Embed Color Update' },
				description: `${clan.name} (${clan.tag})`,
				color
			}
		});
	}
}

module.exports = EditCommand;
