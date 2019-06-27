const { Command } = require('discord-akairo');
const shell = require('shelljs');

class GitPullCommand extends Command {
	constructor() {
		super('git-pull', {
			aliases: ['git-pull', 'git-init', 'sync'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	exec(message) {
		const { stderr, stdout, code } = shell.exec('git pull git@github.com:esuvajit/clashperks.git');
		return message.channel.send([
			`${stderr}`,
			`${stdout}`,
			`Process exited with code ${code}`
		], { code: true, split: true });
	}
}

module.exports = GitPullCommand;
