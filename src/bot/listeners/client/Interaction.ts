import { MsearchMultiSearchItem } from '@elastic/elasticsearch/lib/api/types.js';

import { AutocompleteInteraction, Interaction } from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { nanoid } from 'nanoid';
import { Listener } from '../../lib/index.js';
import ComponentHandler from '../../struct/ComponentHandler.js';
import { mixpanel } from '../../struct/Mixpanel.js';
import { ElasticIndex, Settings } from '../../util/Constants.js';

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
		mixpanel.track('Autocomplete', {
			distinct_id: interaction.user.id,
			guild_id: interaction.guild.id,
			user_id: interaction.user.id,
			user_tag: interaction.user.tag,
			user_name: interaction.user.username,
			guild_name: interaction.guild.name,
			command_id: interaction.commandName,
			sub_command_id: interaction.options.getSubcommand(false),
			autocomplete_field_name: focused,
			autocomplete_query: interaction.options.getString(focused)?.substring(0, 10) ?? null
		});

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
			case 'clan': {
				return this.clanTagAutocomplete(interaction, focused);
			}
			case 'alias': {
				return this.aliasAutoComplete(interaction);
			}
			case 'roster': {
				return this.rosterAutocomplete(interaction);
			}
			case 'group': {
				return this.rosterCategoryAutocomplete(interaction);
			}
		}
	}

	private async rosterAutocomplete(interaction: AutocompleteInteraction<'cached'>) {
		const rosters = await this.client.rosterManager.list(interaction.guild.id);
		if (!rosters.length) return interaction.respond([{ value: '0', name: 'No rosters found.' }]);

		return interaction.respond(
			rosters.map((roster) => ({ value: roster._id.toHexString(), name: `${roster.clan.name} - ${roster.name}`.substring(0, 100) }))
		);
	}

	private async rosterCategoryAutocomplete(interaction: AutocompleteInteraction<'cached'>) {
		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		if (!categories.length) return interaction.respond([{ value: '0', name: 'No categories found.' }]);

		return interaction.respond(
			categories.map((category) => ({ value: category._id.toHexString(), name: `${category.displayName}`.substring(0, 100) }))
		);
	}

	private async aliasAutoComplete(interaction: AutocompleteInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guild.id);
		const aliases = clans.filter((clan) => clan.alias);
		if (!aliases.length) return interaction.respond([{ value: '0', name: 'No aliases found.' }]);

		return interaction.respond(aliases.map((clan) => ({ value: clan.alias!, name: `${clan.alias!} - ${clan.name}` })));
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

	private async playerTagAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused)?.replace(/^\*$/, '');
		this.client.logger.debug(`[${interaction.user.username} (${interaction.user.id})] Searching for "${query ?? ''}"`, {
			label: 'Autocomplete'
		});

		const now = Date.now();
		const result = query
			? await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_PLAYERS },
						{
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.RECENT_PLAYERS },
						{
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.USER_LINKED_PLAYERS },
						{
							query: {
								dis_max: {
									queries: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									tie_breaker: 1
								}
							}
						}
					]
			  })
			: await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_PLAYERS },
						{
							size: 25,
							sort: [{ order: 'asc' }],
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									}
								}
							}
						},
						{ index: ElasticIndex.RECENT_PLAYERS },
						{
							sort: [{ lastSearched: 'desc' }],
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									}
								}
							}
						}
					]
			  });
		this.client.logger.debug(`[${interaction.user.username} (${interaction.user.id})] Search took ${Date.now() - now}ms`, {
			label: 'Autocomplete'
		});

		const players = (result.responses as MsearchMultiSearchItem<{ name: string; tag: string; userId: string }>[])
			.map((res) => res.hits.hits.map((hit) => hit._source!))
			.flat()
			.filter((player, index, self) => self.findIndex((p) => p.tag === player.tag) === index)
			.slice(0, 25);

		if (!players.length) {
			if (query) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter a player tag!' }]);
		}

		return interaction.respond(players.map((player) => ({ value: player.tag, name: `${player.name} (${player.tag})` })));
	}

	private async clansAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused)?.replace(/^\*$/, '');

		this.client.logger.debug(`[${interaction.user.username} (${interaction.user.id})] Searching for "${query ?? ''}"`, {
			label: 'Autocomplete'
		});

		const now = Date.now();
		const result = query
			? await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_CLANS },
						{
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							query: {
								bool: {
									must: {
										term: { guildId: interaction.guild.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						}
					]
			  })
			: await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_CLANS },
						{
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									}
								}
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							size: 25,
							sort: [{ name: 'asc' }],
							query: {
								bool: {
									must: {
										term: { guildId: interaction.guild.id }
									}
								}
							}
						}
						// { index: ElasticIndex.RECENT_CLANS },
						// {
						// 	sort: [{ lastSearched: 'desc' }],
						// 	query: {
						// 		bool: {
						// 			must: {
						// 				term: { userId: interaction.user.id }
						// 			}
						// 		}
						// 	}
						// }
					]
			  });

		this.client.logger.debug(`[${interaction.user.username} (${interaction.user.id})] Search took ${Date.now() - now}ms`, {
			label: 'Autocomplete'
		});

		const clans = (result.responses as MsearchMultiSearchItem<{ name: string; tag: string; guildId?: string; userId?: string }>[])
			.map((res) => res.hits.hits.map((hit) => hit._source!))
			.flat()
			.filter((clan, index, self) => self.findIndex((p) => p.tag === clan.tag) === index);

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
				name: `All of these (${clans.length})`
			});
		}
		return interaction.respond(response);
	}

	private async clanTagAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused);
		this.client.logger.debug(`[${interaction.user.username} (${interaction.user.id})] Searching for "${query ?? ''}"`, {
			label: 'Autocomplete'
		});

		const now = Date.now();
		const result = query
			? await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_CLANS },
						{
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							size: 25,
							sort: [{ name: 'asc' }],
							query: {
								bool: {
									must: {
										term: { guildId: interaction.guild.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.RECENT_CLANS },
						{
							sort: [{ lastSearched: 'desc' }],
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									},
									should: [{ prefix: { name: query } }, { match: { name: query } }, { match: { tag: query } }],
									minimum_should_match: 1
								}
							}
						}
					]
			  })
			: await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_CLANS },
						{
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									}
								}
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							size: 25,
							sort: [{ name: 'asc' }],
							query: {
								bool: {
									must: {
										term: { guildId: interaction.guild.id }
									}
								}
							}
						},
						{ index: ElasticIndex.RECENT_CLANS },
						{
							sort: [{ lastSearched: 'desc' }],
							query: {
								bool: {
									must: {
										term: { userId: interaction.user.id }
									}
								}
							}
						}
					]
			  });
		this.client.logger.debug(`[${interaction.user.username} (${interaction.user.id})] Search took ${Date.now() - now}ms`, {
			label: 'Autocomplete'
		});

		const clans = (result.responses as MsearchMultiSearchItem<{ name: string; tag: string; guildId?: string; userId?: string }>[])
			.map((res) => res.hits.hits.map((hit) => hit._source!))
			.flat()
			.filter((clan, index, self) => self.findIndex((p) => p.tag === clan.tag) === index)
			.slice(0, 25);

		if (!clans.length) {
			if (query) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter a clan tag!' }]);
		}
		return interaction.respond(clans.map((clan) => ({ value: clan.tag, name: `${clan.name} (${clan.tag})` })));
	}

	private async getQuery(query: string) {
		const value = query.length > 100 ? nanoid() : query;
		if (query.length > 100) await this.client.redis.connection.set(value, query, { EX: 60 * 60 });
		return value;
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
			this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.username}]`, { label: 'COMPONENT_BLOCKED' });
			return interaction.reply({ content: this.i18n('common.component.unauthorized', { lng: interaction.locale }), ephemeral: true });
		}

		if (this.client.components.has(interaction.customId)) return;
		if (await this.componentHandler.exec(interaction)) return;

		this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.username}]`, { label: 'COMPONENT_EXPIRED' });
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
