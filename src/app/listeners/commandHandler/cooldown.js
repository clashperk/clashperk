const { Listener } = require('discord-akairo');
const ms = require('ms');

class CooldownListener extends Listener {
	constructor() {
		super('cooldown', {
			event: 'cooldown',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
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
			if (this.client.patron.users.get(message.author, 'patron', false)) {
				embed.setDescription([
					`The default cooldown is ${ms(cooldown, { long: true })}, but as a donator you only need to wait ${this.donator(command)} sec.`
				]);
			} else {
				embed.setDescription([
					`You'll be able to use this command again in **${time}**`,
					`The default cooldown is ${ms(cooldown, { long: true })}, but [voters](https://discordbots.org/bot/526971716711350273/vote) and [donators](https://www.patreon.com/bePatron?u=14584309) only need to wait ${this.default(command)} sec!`,
					'',
					'While you wait, go [vote us](https://discordbots.org/bot/526971716711350273/vote) and check out our [Patreon](https://www.patreon.com/bePatron?u=14584309)'
				]);
			}
			return message.channel.send({ embed });
		}
	}

	default(command) {
		if (['start', 'th-compo', 'members-th'].includes(command.id)) return 3;
		return 1;
	}

	donator(command) {
		if (['start', 'th-compo', 'members-th'].includes(command.id)) return 20;
		return 3;
	}
}

module.exports = CooldownListener;
