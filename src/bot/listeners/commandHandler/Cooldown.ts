import { Listener, Command } from 'discord-akairo';
import { Message, TextChannel } from 'discord.js';
import ms from 'ms';

export default class CooldownListener extends Listener {
	public constructor() {
		super('cooldown', {
			event: 'cooldown',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(message: Message, command: Command, remaining: number) {
		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ ${ms(remaining, { 'long': true })}`, { label });

		const cooldown = typeof command.cooldown === 'function'
			? command.cooldown(message)
			: command.cooldown
				? command.cooldown
				: typeof this.client.commandHandler.defaultCooldown === 'function'
					? this.client.commandHandler.defaultCooldown(message)
					: this.client.commandHandler.defaultCooldown;

		if (message.guild ? (message.channel as TextChannel).permissionsFor(this.client.user!)?.has('SEND_MESSAGES') : true) {
			const embed = this.client.util.embed()
				.setAuthor('Slow it down!')
				.setColor(this.client.embed(message));
			if (this.client.patrons.get(message)) {
				embed.setDescription([
					'The default cooldown is **3 seconds**, but as a donator you only need to wait **1 second**.'
				].join('\n'));
			} else {
				embed.setDescription([
					`You'll be able to use this command again in **${ms(remaining, { 'long': true })}**`,
					`The default cooldown is **${ms(cooldown, { 'long': true })}** but donators only need to wait **1 second**.`,
					'<https://www.patreon.com/clashperk>'
				].join('\n'));
			}

			if ((message.channel as TextChannel).permissionsFor(this.client.user!)?.has('EMBED_LINKS')) {
				return message.channel.send({ embeds: [embed] });
			}

			return message.channel.send(`**${embed.author!.name}**\n${embed.description!}`);
		}
	}
}
