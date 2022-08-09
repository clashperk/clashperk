import { Interaction } from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { Listener } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export default class InteractionListener extends Listener {
	public constructor() {
		super('interaction', {
			emitter: 'client',
			category: 'client',
			event: 'interactionCreate'
		});
	}

	public exec(interaction: Interaction) {
		if (interaction.inCachedGuild()) this.autocomplete(interaction);
		this.contextInteraction(interaction);
		this.componentInteraction(interaction);
	}

	public async autocomplete(interaction: Interaction<'cached'>) {
		if (!interaction.isAutocomplete()) return;

		switch (interaction.options.getFocused(true).name) {
			case 'duration': {
				const dur = interaction.options.getString('duration');
				const label = (duration: number) => moment.duration(duration).format('H[h] m[m]', { trim: 'both mid' });

				if (dur && !isNaN(parseInt(dur, 10))) {
					const duration = parseInt(dur, 10);
					if (duration < 60 && dur.includes('m')) {
						return interaction.respond(['15m', '30m', '45m', '1h'].map((value) => ({ value, name: value })));
					}

					return interaction.respond(
						['h', '.25h', '.5h', '.75h'].map((num) => ({ value: `${duration}${num}`, name: label(ms(`${duration}${num}`)) }))
					);
				}

				return interaction.respond(['30m', '1h', '2.5h', '5h'].map((value) => ({ value, name: label(ms(value)) })));
			}
			case 'clans': {
				const clans = await this.client.storage.find(interaction.guildId);
				if (!clans.length) return;
				return interaction.respond(clans.map((clan) => ({ value: clan.tag, name: clan.name })));
			}
		}
	}

	private async contextInteraction(interaction: Interaction) {
		if (!interaction.isContextMenu()) return;
		if (this.inhibitor(interaction)) return;
		if (!interaction.inCachedGuild()) return;

		const command = this.client.commandHandler.modules.get(interaction.commandName.toLowerCase());
		if (!command) return;
		if (this.client.commandHandler.preInhibitor(interaction, command)) return;

		const args =
			interaction.targetType === 'MESSAGE'
				? { message: interaction.options.getMessage('message')?.content ?? '' }
				: { member: interaction.options.getMember('user', false) };
		return this.client.commandHandler.exec(interaction, command, args);
	}

	private async componentInteraction(interaction: Interaction) {
		if (!interaction.isButton() && !interaction.isSelectMenu()) return;
		if (this.inhibitor(interaction)) return;

		const userIds = this.client.components.get(interaction.customId);
		if (userIds?.length && userIds.includes(interaction.user.id)) return;
		if (userIds?.length && !userIds.includes(interaction.user.id)) {
			this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.tag}]`, { label: 'COMPONENT_BLOCKED' });
			return interaction.reply({ content: this.i18n('common.component.unauthorized', { lng: interaction.locale }), ephemeral: true });
		}

		if (this.client.components.has(interaction.customId)) return;
		if (await this.client.automaton.exec(interaction)) return;

		this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.tag}]`, { label: 'COMPONENT_EXPIRED' });
		await interaction.update({ components: [] });
		return interaction.followUp({ content: this.i18n('common.component.expired', { lng: interaction.locale }), ephemeral: true });
	}

	private inhibitor(interaction: Interaction) {
		if (!interaction.inGuild()) return true;

		const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
		if (guilds.includes(interaction.guildId)) return true;

		const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		return users.includes(interaction.user.id);
	}
}
