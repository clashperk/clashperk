const { Listener } = require('discord-akairo');
const ms = require('ms');

class CooldownListener extends Listener {
	constructor() {
		super('cooldown', {
			event: 'cooldown',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});

		this.commands = [
			'donationlog',
			'playerlog',
			'lastonlineboard',
			'clangamesboard',
			'th-compo',
			'members-th',
			'warweight',
			'cwl-top',
			'cwl-members',
			'cwl-remaining',
			'cwl-round',
			'cwl-stats',
			'cwl-lineup',
			'cwl-attacks'
		];
	}

	exec(message, command, remaining) {
		const time = ms(remaining, { long: true });
		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ ${time}`, { label });

		const cooldown = typeof command.cooldown === 'function' ? command.cooldown(message) : command.cooldown ? command.cooldown : this.client.commandHandler.defaultCooldown;

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			const embed = this.client.util.embed()
				.setAuthor('Slow it down!')
				.setColor(0x5970c1);
			if (this.client.patron.isPatron(message.author, message.guild)) {
				embed.setDescription([
					`The default cooldown is ${this.donator(command)} sec, but as a donator you only need to wait ${ms(cooldown, { long: true })} sec.`
				]);
			} else {
				embed.setDescription([
					`You'll be able to use this command again in **${time}**`,
					`The default cooldown is ${ms(cooldown, { long: true })}, but [donators](https://www.patreon.com/join/clashperk) only need to wait ${this.default(command)} sec!`
				]);
			}
			return message.channel.send({ embed });
		}
	}

	default(command) {
		if (this.commands.includes(command.id)) return 3;
		return 1;
	}

	donator(command) {
		if (this.commands.includes(command.id)) return 10;
		return 3;
	}
}

module.exports = CooldownListener;
