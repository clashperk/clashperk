const { Command } = require('discord-akairo');
const { MessageEmbed, Flag } = require('discord.js');
const Clans = require('../../models/Clans');

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
			type: async (msg, phrase) => {
				if (!phrase) return null;
				const tag = `#${phrase.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
				const data = await Clans.findOne({ where: { guild: msg.guild.id, tag } });
				if (!data) return null;
				return data;
			},
			prompt: {
				start: 'what is the clan tag?',
				retry: (msg, { phrase }) => `clan tag *${phrase}* not found!`
			}
		};
		const color = yield {
			type: 'color',
			prompt: {
				start: 'what\'s the color you want to apply to this clan?',
				retry: 'please provide a valid hex color.'
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
				ended: message => `${message.author}, command has been cancelled.`
			}
		};

		return { clan, color, confirm };
	}

	async exec(message, { clan, color }) {
		await clan.update({ color });
		this.client.tracker.add(clan.tag, message.guild.id, clan.channel, color);
		return message.util.send(`Color updated for **${clan.name} (${clan.tag})**`);
	}
}

module.exports = EditCommand;
