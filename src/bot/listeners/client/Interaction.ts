import { Interaction } from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { nanoid } from 'nanoid';
import { Listener } from '../../lib/index.js';
import ComponentHandler from '../../struct/ComponentHandler.js';
import { Settings } from '../../util/Constants.js';

export default class InteractionListener extends Listener {
	private readonly componentHandler: ComponentHandler;

	public constructor() {
		super('interaction', {
			emitter: 'client',
			category: 'client',
			event: 'interactionCreate'
		});
		this.componentHandler = new ComponentHandler(this.client);
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
				const query = interaction.options.getString('clans');
				const clans = await this.client.storage.collection
					.find({
						guild: interaction.guildId,
						...(query ? { $text: { $search: query } } : {})
					})
					.toArray();
				if (!clans.length) {
					if (query) return interaction.respond([{ value: query, name: query }]);
					return interaction.respond([{ value: '0', name: 'Enter clan tags or names!' }]);
				}
				const response = clans.slice(0, 24).map((clan) => ({ value: clan.tag, name: clan.name }));
				if (response.length > 1) {
					const tags = clans.map((clan) => clan.tag).join(',');
					const value = tags.length > 100 ? nanoid() : tags;
					if (tags.length > 100) await this.client.redis.set(value, tags, { EX: 60 * 60 });
					response.push({
						value,
						name: `All of these (${clans.length})`
					});
				}
				return interaction.respond(response);
			}
			case 'tag': {
				const tag = interaction.options.getString('tag');
				const clans = await this.client.storage.collection
					.find({
						guild: interaction.guildId,
						...(tag ? { $text: { $search: tag } } : {})
					})
					.limit(25)
					.toArray();
				if (!clans.length) {
					if (tag) return interaction.respond([{ value: tag, name: tag }]);
					return interaction.respond([{ value: '0', name: 'Enter a clan tag!' }]);
				}
				return interaction.respond(clans.map((clan) => ({ value: clan.tag, name: clan.name })));
			}
		}
	}

	private async contextInteraction(interaction: Interaction) {
		if (!interaction.isContextMenuCommand()) return;

		const commandId = interaction.commandName.replace(/\s+/g, '-').toLowerCase();
		if (commandId === 'clear-components') return interaction.reply({ components: [] });

		const command = this.client.commandHandler.modules.get(commandId);
		if (!command) return;

		if (this.client.commandHandler.preInhibitor(interaction, command)) return;

		const args = interaction.isMessageContextMenuCommand()
			? { message: interaction.options.getMessage('message')?.content ?? '' }
			: { member: interaction.options.getMember('user') };
		return this.client.commandHandler.exec(interaction, command, args);
	}

	private async componentInteraction(interaction: Interaction) {
		if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
		if (this.inhibitor(interaction)) return;

		const userIds = this.client.components.get(interaction.customId);
		if (userIds?.length && userIds.includes(interaction.user.id)) return;
		if (userIds?.length && !userIds.includes(interaction.user.id)) {
			this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.tag}]`, { label: 'COMPONENT_BLOCKED' });
			return interaction.reply({ content: this.i18n('common.component.unauthorized', { lng: interaction.locale }), ephemeral: true });
		}

		if (this.client.components.has(interaction.customId)) return;
		if (await this.componentHandler.exec(interaction)) return;

		this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.tag}]`, { label: 'COMPONENT_EXPIRED' });
		await interaction.update({ components: [] });
		return interaction.followUp({ content: this.i18n('common.component.expired', { lng: interaction.locale }), ephemeral: true });
	}

	private inhibitor(interaction: Interaction) {
		// TODO: Add more checks
		if (!interaction.inCachedGuild()) return true;
		if (!interaction.channel) return true;

		const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
		if (guilds.includes(interaction.guildId)) return true;

		const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		return users.includes(interaction.user.id);
	}
}
