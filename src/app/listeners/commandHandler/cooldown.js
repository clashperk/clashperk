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
		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ ${ms(remaining, { long: true })}`, { label });

		const cooldown = typeof command.cooldown === 'function'
			? command.cooldown(message)
			: command.cooldown
				? command.cooldown
				: this.client.commandHandler.defaultCooldown;

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			const embed = this.client.util.embed()
				.setAuthor('Slow it down!')
				.setColor(this.client.embed(message));
			if (this.client.patron.check(message.author, message.guild)) {
				embed.setDescription([
					'The default cooldown is **3 seconds**, but as a donator you only need to wait **1 second**.'
				]);
			} else {
				embed.setDescription([
					`You'll be able to use this command again in **${ms(remaining, { long: true })}**`,
					`The default cooldown is **${ms(cooldown, { long: true })}** but donators only need to wait **1 second**.`,
					'<https://www.patreon.com/join/clashperk>'
				]);
			}

			if (message.channel.permissionsFor(this.client.user).has('EMBED_LINKS')) {
				return message.channel.send({ embed });
			}

			return message.channel.send([
				`**${embed.author.name}**`,
				`${embed.description}`
			]);
		}
	}
}

module.exports = CooldownListener;
