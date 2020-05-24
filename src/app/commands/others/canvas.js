const { Command } = require('discord-akairo');
const { MessageAttachment } = require('discord.js');

class CanvasCommand extends Command {
	constructor() {
		super('canvas', {
			aliases: ['canvas', 'cnv'],
			category: 'owner',
			channel: 'guild',
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			},
			args: [
				{
					id: 'txt',
					match: 'content',
					default: msg => msg.author.tag
				}
			]
		});
	}

	async exec(message, { txt }) {
		const Canvas = require('canvas');
		const background = await Canvas.loadImage('https://cdn.discordapp.com/attachments/707884431314124800/714058385636458516/thumb-1920-857565.jpg');
		const canvas = Canvas.createCanvas(1920, 1200);
		const ctx = canvas.getContext('2d');

		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		ctx.font = '60px sans-seriff';
		ctx.fillStyle = '#f30c11';
		ctx.fillText(txt, canvas.width / 2.5, canvas.height / 1.8);

		ctx.beginPath();
		ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.clip();

		const attachment = new MessageAttachment(canvas.toBuffer(), 'image.png');
		return message.channel.send('', attachment);
	}
}

module.exports = CanvasCommand;
