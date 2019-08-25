const { Command, Argument } = require('discord-akairo');
const request = require('request');
const { firebase } = require('../../struct/Database');

class DeleteMemeCommand extends Command {
	constructor() {
		super('del-meme', {
			aliases: ['del-meme'],
			clientPermissions: ['EMBED_LINKS'],
			category: 'owner',
			description: {
				content: 'Deletes meme by ID.',
				usage: '<id>'
			},
			args: [
				{
					id: 'id',
					type: async (msg, id) => {
						if (!id) return null;
						const data = await firebase.ref('memes')
							.child(id)
							.once('value')
							.then(snap => snap.val());
						if (!data) return null;
						return data.deletehash;
					},
					prompt: {
						start: 'what is the id of the image?'
					}
				}
			]
		});
	}

	async exec(message, { data }) {
		if (message.guild.id !== '524672414261444623') return;

		request({
			url: `https://api.imgur.com/3/image/${data.deletehash}`,
			method: 'DELETE',
			headers: { Authorization: `Client-ID ${process.env.IMGUR}` }
		}, async (error, response, body) => {
			if (error) {
				console.error(error);
				return message.util.send(JSON.stringify(error), { code: 'json' });
			}
			if (response.statusCode === 200) {
				await firebase.ref('memes').child(data.id).remove();
				return message.util.send(JSON.stringify(body), { code: 'json' });
			}
			return message.util.send(JSON.stringify(body), { code: 'json' });
		});
	}
}

module.exports = DeleteMemeCommand;
