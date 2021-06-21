import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import shell from 'shelljs';

export default class GitPullCommand extends Command {
	public constructor() {
		super('git-pull', {
			aliases: ['git-pull', 'git-init', 'pull', 'sync'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	public exec(message: Message) {
		const { stderr, stdout, code }: { stderr: string; stdout: string; code: number } = shell.exec('git pull');
		return message.channel.send({
			code: true, split: true,
			content: [`${stderr}`, `${stdout}`, `Code ${code}`].join('\n')
		});
	}
}
