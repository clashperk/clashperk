const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');

class CocMemeCommand extends Command {
	constructor() {
		super('cocmeme', {
			aliases: ['cocmeme', 'cocmemes'],
			clientPermissions: ['EMBED_LINKS'],
			category: 'other',
			description: {
				content: 'Receives random Clash of Clans memes.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message) {
		const album = this.client.settings.get('global', 'albumID', process.env.ALBUM_ID);
		const res = await fetch(`https://api.imgur.com/3/album/${album}/images`, {
			method: 'GET', headers: { Authorization: `Client-ID ${process.env.IMGUR}` }
		});
		const body = await res.json();
		const image = Math.floor(Math.random() * body.data.length);
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setTitle(body.data[image].title.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()))
			.setURL(body.data[image].link)
			.setImage(body.data[image].link);
		return message.util.send({ embed });
	}
}

module.exports = CocMemeCommand;
