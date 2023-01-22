import { AutocompleteInteraction, Interaction } from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { nanoid } from 'nanoid';
import { Listener } from '../../lib/index.js';
import ComponentHandler from '../../struct/ComponentHandler.js';
import { PlayerLinks } from '../../types/index.js';
import { Collections, Settings } from '../../util/Constants.js';

const ranges: Record<string, number> = {
	'clan-wars': ms('46h'),
	'capital-raids': ms('3d'),
	'clan-games': ms('5d') + ms('23h'),
	'default': ms('5d') + ms('23h')
};

const preferences: Record<string, string[]> = {
	'clan-wars': [
		'15m',
		'30m',
		'1h',
		'1h 30m',
		'2h',
		'2h 30m',
		'3h',
		'4h',
		'6h',
		'8h',
		'10h',
		'12h',
		'14h',
		'16h',
		'18h',
		'23h',
		'1d',
		'1d 6h',
		'1d 12h'
	],
	'capital-raids': [
		'1h',
		'6h',
		'10h',
		'12h',
		'15h',
		'16h',
		'18h',
		'20h',
		'23h',
		'1d',
		'1d 12h',
		'1d 18h',
		'2d',
		'2d 12h',
		'2d 18h',
		'2d 23h'
	],
	'clan-games': [
		'1h',
		'2h',
		'3h',
		'4h',
		'6h',
		'8h',
		'10h',
		'12h',
		'14h',
		'16h',
		'18h',
		'20h',
		'23h',
		'1d',
		'1d 6h',
		'1d 12h',
		'2d',
		'2d 12h',
		'3d',
		'4d'
	],
	'default': ['1h', '4h', '10h', '12h', '16h', '20h', '1d', '1d 6h', '2d', '3d', '4d', '5d', '5d 23h']
};

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

	private inRange(dur: number, cmd: string | null) {
		const minDur = ms('15m');
		const maxDur = ranges[cmd ?? 'default'];
		return dur >= minDur && dur <= maxDur;
	}

	private getLabel(dur: number) {
		return moment.duration(dur).format('d[d] h[h] m[m]', { trim: 'both mid' });
	}

	private getTimes(times: string[], matchedDur: number, cmd: string | null) {
		if (this.inRange(matchedDur, cmd)) {
			const value = this.getLabel(matchedDur);
			if (times.includes(value)) times.splice(times.indexOf(value), 1);
			times.unshift(value);
		}
		return times.map((value) => ({ value, name: value }));
	}

	public async autocomplete(interaction: Interaction<'cached'>) {
		if (!interaction.isAutocomplete()) return;

		const focused = interaction.options.getFocused(true).name;
		switch (focused) {
			case 'duration': {
				return this.durationAutocomplete(interaction, focused);
			}
			case 'clans': {
				return this.clansAutocomplete(interaction, focused);
			}
			case 'tag': {
				if (['player', 'units', 'upgrades', 'rushed', 'verify'].includes(interaction.commandName)) {
					return this.playerTagAutocomplete(interaction, focused);
				}
				return this.clanTagAutocomplete(interaction, focused);
			}
			case 'player_tag': {
				return this.playerTagAutocomplete(interaction, focused);
			}
			case 'clan_tag': {
				return this.clanTagAutocomplete(interaction, focused);
			}
		}
	}

	private async durationAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const cmd = interaction.options.getString('type');
		const dur = interaction.options.getString(focused);
		const matchedDur = dur?.match(/\d+?\.?\d+?[dhm]|\d[dhm]/g)?.reduce((acc, cur) => acc + ms(cur), 0) ?? 0;

		if (dur && !isNaN(parseInt(dur, 10))) {
			const duration = parseInt(dur, 10);
			if (duration < 60 && dur.includes('m')) {
				const times = ['15m', '30m', '45m', '1h'];
				return interaction.respond(this.getTimes(times, matchedDur, cmd));
			}

			if (dur.includes('d')) {
				const times = [6, 12, 18, 20, 0].map((num) => this.getLabel(ms(`${duration * 24 + num}h`)));
				return interaction.respond(this.getTimes(times, matchedDur, cmd));
			}

			const times = ['h', '.25h', '.5h', '.75h'].map((num) => this.getLabel(ms(`${duration}${num}`)));
			return interaction.respond(this.getTimes(times, matchedDur, cmd));
		}

		const times = preferences[cmd ?? 'default'];
		return interaction.respond(this.getTimes(times, matchedDur, cmd));
	}

	private async clansAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused)?.replace(/^\*$/, '');
		const clans = await this.client.storage.collection
			.find(
				{
					guild: interaction.guildId,
					...(query ? { $text: { $search: query } } : {})
				},
				{ sort: { name: 1 } }
			)
			.toArray();
		if (!clans.length) {
			if (query) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter clan tags or names!' }]);
		}
		const response = clans.slice(0, 24).map((clan) => ({ value: clan.tag, name: clan.name }));
		if (response.length > 1) {
			const clanTags = clans.map((clan) => clan.tag).join(',');
			const value = await this.getQuery(clanTags);
			response.unshift({
				value,
				name: `**All of these (${clans.length})**`
			});
		}
		return interaction.respond(response);
	}

	private async getQuery(query: string) {
		const value = query.length > 100 ? nanoid() : query;
		if (query.length > 100) await this.client.redis.set(value, value, { EX: 60 * 60 });
		return value;
	}

	private async playerTagAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused);
		const players = await this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.find({ userId: interaction.user.id, ...(query ? { $text: { $search: query } } : {}) }, query ? {} : { sort: { order: 1 } })
			.limit(25)
			.toArray();
		if (!players.length) {
			if (query) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter a player tag!' }]);
		}
		return interaction.respond(players.map((player) => ({ value: player.tag, name: `${player.name} (${player.tag})` })));
	}

	private async clanTagAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused);
		const clans = await this.client.storage.collection
			.find(
				{
					guild: interaction.guildId,
					...(query ? { $text: { $search: query } } : {})
				},
				{ sort: { name: 1 } }
			)
			.limit(25)
			.toArray();
		if (!clans.length) {
			if (query) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter a clan tag!' }]);
		}
		return interaction.respond(clans.map((clan) => ({ value: clan.tag, name: `${clan.name} (${clan.tag})` })));
	}

	private async contextInteraction(interaction: Interaction) {
		if (!interaction.isContextMenuCommand()) return;

		const commandId = interaction.commandName.replace(/\s+/g, '-').toLowerCase();
		const command = this.client.commandHandler.getCommand(commandId);
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
