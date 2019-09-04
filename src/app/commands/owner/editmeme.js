const { Command } = require('discord-akairo');
const request = require('request');
const { firebase } = require('../../struct/Database');

class EditMemeCommand extends Command {
	constructor() {
		super('edit-meme', {
			aliases: ['edit-meme'],
			clientPermissions: ['EMBED_LINKS'],
			category: 'owner',
			channel: 'guild',
			description: {
				content: 'Edits memes by ID.',
				usage: '<id>'
			},
			args: [
				{
					id: 'data',
					type: async (msg, id) => {
						if (!id) return null;
						const data = await firebase.ref('memes')
							.child(id)
							.once('value')
							.then(snap => snap.val())
							.catch(() => null);
						return data;
					},
					prompt: {
						start: 'what is the id of the image?',
						retry: 'ID not found! Please provide a valid ID.'
					}
				},
				{
					id: 'title',
					match: 'rest',
					prompt: {
						start: 'what is the new title?'
					}
				}
			]
		});
	}

	async exec(message, { data, title }) {
		if (message.guild.id !== '524672414261444623') return;

		request({
			url: `https://api.imgur.com/3/image/${data.deletehash}`,
			method: 'POST',
			headers: { Authorization: `Client-ID ${process.env.IMGUR}` },
			form: { title }
		}, async (error, response, body) => {
			if (error) {
				console.error(error);
				return message.util.send(error, { code: 'json' });
			}
			if (response.statusCode === 200) {
				await firebase.ref('memes').child(data.id).update({ discord_user_id: message.author.id, title });
				const embed = this.client.util.embed()
					.setColor(0x10ffc1)
					.setAuthor(message.author.tag, message.author.displayAvatarURL())
					.setTitle(title)
					.setURL(data.link)
					.setThumbnail(data.link)
					.setFooter(data.id);
				return message.util.send({ embed });
			}
			return message.util.send(body, { code: 'json' });
		});
	}
}

module.exports = EditMemeCommand;
