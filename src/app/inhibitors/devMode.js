const { Inhibitor } = require('discord-akairo');

class DeveloperMode extends Inhibitor {
	constructor() {
		super('devMode', {
			reason: 'devMode'
		});
	}

	async exec(message, command) {
		if (process.env.NODE_ENV) return false;
		await message.channel.send([
			'**Due to some problem this command has been temporary disabled.**',
			'',
			'Join Support Server https://discord.gg/ppuppun'
		]);
		return ['setup-hidden', 'profile', 'activity'].includes(command.categoryID);
	}
}

module.exports = DeveloperMode;
