import { MsearchMultiSearchItem, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types.js';

import { addBreadcrumb } from '@sentry/node';
import { AutocompleteInteraction, ChannelType, Interaction, InteractionType } from 'discord.js';
import moment from 'moment';
import { Filter } from 'mongodb';
import ms from 'ms';
import { nanoid } from 'nanoid';
import { Listener } from '../../lib/index.js';
import ComponentHandler from '../../struct/ComponentHandler.js';
import Google from '../../struct/Google.js';
import { mixpanel } from '../../struct/Mixpanel.js';
import { IRoster, IRosterCategory } from '../../struct/RosterManager.js';
import { UserInfoModel, UserTimezone } from '../../types/index.js';
import { Collections, ElasticIndex, Settings } from '../../util/Constants.js';

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

const getQuery = (query: string): QueryDslQueryContainer[] => {
	return [
		{
			prefix: {
				name: {
					value: `${query}`,
					case_insensitive: true
				}
			}
		},
		{
			wildcard: {
				tag: {
					value: `*${query}*`,
					case_insensitive: true
				}
			}
		}
	];
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
		this.autocomplete(interaction);
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

	public async autocomplete(interaction: Interaction) {
		if (!interaction.isAutocomplete()) return;
		const focused = interaction.options.getFocused(true).name;
		mixpanel.track('Autocomplete', {
			distinct_id: interaction.user.id,
			guild_id: interaction.guildId ?? '0',
			user_id: interaction.user.id,
			username: interaction.user.username,
			display_name: interaction.user.displayName,
			guild_name: interaction.guild?.name ?? 'DM',
			command_id: interaction.commandName,
			sub_command_id: interaction.options.getSubcommand(false),
			autocomplete_field_name: focused,
			autocomplete_query: interaction.options.getString(focused)?.substring(0, 10) ?? null
		});

		addBreadcrumb({
			message: 'autocomplete_started',
			data: {
				user: {
					id: interaction.user.id,
					displayName: interaction.user.displayName,
					username: interaction.user.username
				},
				guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : interaction.guildId,
				channel: interaction.channel
					? { id: interaction.channel.id, type: ChannelType[interaction.channel.type] }
					: interaction.channelId,
				command: interaction.commandName,
				interaction: {
					id: interaction.id,
					type: InteractionType[interaction.type]
				},
				[focused]: interaction.options.getString(focused)?.substring(0, 100),
				args: this.client.commandHandler.rawArgs(interaction)
			}
		});

		if (['player', 'units', 'upgrades', 'rushed'].includes(interaction.commandName) && ['player_tag', 'tag'].includes(focused)) {
			return this.playerTagAutocomplete(interaction, focused);
		}
		if (!interaction.inCachedGuild()) return null;

		switch (focused) {
			case 'duration': {
				return this.durationAutocomplete(interaction, focused);
			}
			case 'clans': {
				return this.clansAutocomplete(interaction, focused);
			}
			case 'category': {
				return this.client.autocomplete.clanCategoriesAutoComplete(interaction);
			}
			case 'tag': {
				if (['player', 'units', 'upgrades', 'rushed', 'verify'].includes(interaction.commandName)) {
					return this.playerTagAutocomplete(interaction, focused);
				}

				return this.clanTagAutocomplete(interaction, focused);
			}
			case 'player_tag': {
				const subCommand = interaction.options.getSubcommand(false);
				if (interaction.commandName === 'roster' && subCommand === 'manage') {
					return this.client.autocomplete.handle(interaction);
				}
				if (interaction.commandName === 'flag' && subCommand && ['delete', 'create', 'list'].includes(subCommand)) {
					return this.client.autocomplete.handle(interaction);
				}
				return this.playerTagAutocomplete(interaction, focused);
			}
			case 'flag_ref': {
				return this.client.autocomplete.handle(interaction);
			}
			case 'clan_tag': {
				return this.clanTagAutocomplete(interaction, focused);
			}
			case 'clan': {
				return this.clanTagAutocomplete(interaction, focused);
			}
			case 'alias': {
				return this.aliasAutoComplete(interaction, focused);
			}
			case 'target_roster':
			case 'roster': {
				const subCommand = interaction.options.getSubcommand(false);
				if (interaction.commandName === 'roster' && subCommand === 'manage' && focused === 'target_roster') {
					return this.client.autocomplete.handle(interaction);
				}
				return this.rosterAutocomplete(interaction, focused);
			}
			case 'target_group':
			case 'group': {
				const subCommand = interaction.options.getSubcommand(false);
				if (interaction.commandName === 'roster' && subCommand === 'manage' && focused === 'target_group') {
					return this.client.autocomplete.handle(interaction);
				}
				return this.rosterCategoryAutocomplete(interaction, focused);
			}
			case 'timezone': {
				return this.timezoneAutocomplete(interaction, focused);
			}
		}
	}

	private async timezoneAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused)?.trim();
		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});
		const text = query?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') ?? '';

		const now = Date.now();
		const rest = {
			$match: {
				$or: [
					{ 'timezone.id': { $regex: `.*${text}*.`, $options: 'i' } },
					{ 'timezone.name': { $regex: `.*${text}*.`, $options: 'i' } },
					{ 'timezone.location': { $regex: `.*${text}*.`, $options: 'i' } }
				]
			}
		};

		const collection = this.client.db.collection<UserInfoModel>(Collections.USERS);
		const cursor = collection.aggregate<{ _id: string; timezone: UserTimezone }>([
			{
				$match: {
					timezone: {
						$exists: true
					}
				}
			},
			{
				$replaceRoot: {
					newRoot: '$timezone'
				}
			},
			{
				$group: {
					_id: '$id',
					timezone: {
						$first: '$$ROOT'
					},
					uses: {
						$sum: 1
					}
				}
			},
			{
				$sort: {
					uses: -1
				}
			},
			...(query ? [rest] : []),
			{
				$limit: 24
			}
		]);

		const [user, result] = await Promise.all([collection.findOne({ userId: interaction.user.id }), cursor.toArray()]);
		if (user?.timezone && !query) result.unshift({ _id: user.timezone.id, timezone: user.timezone });

		if (!result.length && query) {
			const raw = await Google.timezone(query);
			// eslint-disable-next-line
			if (raw?.location && raw.timezone) {
				const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
				const timezone = {
					id: raw.timezone.timeZoneId,
					offset: Number(offset),
					name: raw.timezone.timeZoneName,
					location: raw.location.formatted_address
				};
				result.push({ _id: timezone.id, timezone });
			}
		}

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		const timezones = result.filter((timezone, index, self) => self.findIndex((t) => t._id === timezone._id) === index);
		if (!timezones.length) return interaction.respond([{ value: '0', name: 'No timezones found.' }]);
		return interaction.respond(
			timezones.map(({ timezone }) => ({
				value: timezone.id,
				name: `${moment.tz(new Date(), timezone.id).format('kk:mm')} - ${timezone.id}`
			}))
		);
	}

	private async rosterAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const filter: Filter<IRoster> = {
			guildId: interaction.guild.id
		};

		const query = interaction.options.getString(focused)?.trim();

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});
		const now = Date.now();

		if (query) {
			const text = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			filter.name = { $regex: `.*${text}.*`, $options: 'i' };
		}

		const cursor = this.client.rosterManager.rosters.find(filter, { projection: { members: 0 } });
		if (!query) cursor.sort({ _id: -1 });

		const rosters = await cursor.limit(24).toArray();

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});
		if (!rosters.length) return interaction.respond([{ value: '0', name: 'No rosters found.' }]);

		return interaction.respond(
			rosters.map((roster) => ({ value: roster._id.toHexString(), name: `${roster.clan.name} - ${roster.name}`.substring(0, 100) }))
		);
	}

	private async rosterCategoryAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const filter: Filter<IRosterCategory> = {
			guildId: interaction.guild.id
		};
		const query = interaction.options.getString(focused)?.trim();

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});
		const now = Date.now();

		if (query) {
			const text = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			filter.displayName = { $regex: `.*${text}.*`, $options: 'i' };
		}

		const cursor = this.client.rosterManager.categories.find(filter);
		if (!query) cursor.sort({ _id: -1 });

		const categories = await cursor.limit(24).toArray();

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		if (!categories.length) return interaction.respond([{ value: '0', name: 'No categories found.' }]);
		return interaction.respond(
			categories.map((category) => ({ value: category._id.toHexString(), name: `${category.displayName}`.substring(0, 100) }))
		);
	}

	private async aliasAutoComplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const clans = await this.client.storage.find(interaction.guild.id);
		const query = interaction.options
			.getString(focused)
			?.trim()
			?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});
		const now = Date.now();

		const aliases = clans
			.filter((clan) => clan.alias)
			.filter((alias) => (query ? new RegExp(`.*${query}.*`, 'i').test(alias.alias!) : true))
			.slice(0, 24);

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		if (!aliases.length) return interaction.respond([{ value: '0', name: 'No aliases found.' }]);
		return interaction.respond(aliases.map((clan) => ({ value: clan.alias!, name: `${clan.alias!} - ${clan.name}` })));
	}

	private async durationAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const cmd = interaction.options.getString('type');
		const dur = interaction.options.getString(focused)?.trim();
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

	private async playerTagAutocomplete(interaction: AutocompleteInteraction, focused: string) {
		const query = interaction.options.getString(focused)?.trim()?.replace(/^\*$/, '').substring(0, 500);
		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild?.name ?? 'DM'}/${interaction.user.displayName}`
		});

		const userId = interaction.user.id;

		const now = Date.now();
		const result = query
			? await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_PLAYERS },
						{
							query: {
								bool: {
									must: { term: { userId } },
									should: getQuery(query),
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.RECENT_PLAYERS },
						{
							query: {
								bool: {
									must: { term: { userId } },
									should: getQuery(query),
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.USER_LINKED_PLAYERS },
						{
							query: {
								dis_max: {
									queries: getQuery(query),
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
									must: { term: { userId } }
								}
							}
						},
						{ index: ElasticIndex.RECENT_PLAYERS },
						{
							sort: [{ lastSearched: 'desc' }],
							query: {
								bool: {
									must: { term: { userId } }
								}
							}
						}
					]
			  });
		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild?.name ?? 'DM'}/${interaction.user.displayName}`
		});

		const players = (result.responses as MsearchMultiSearchItem<{ name: string; tag: string; userId: string }>[])
			.map((res) => res.hits.hits.map((hit) => hit._source!))
			.flat()
			.filter((player) => player.name && player.tag)
			.filter((player, index, _players) => _players.findIndex((p) => p.tag === player.tag) === index)
			.slice(0, 25);

		if (!players.length) {
			if (query && this.isValidQuery(query)) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter a player tag!' }]);
		}

		return interaction.respond(players.map((player) => ({ value: player.tag, name: `${player.name} (${player.tag})` })));
	}

	private async clansAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused)?.trim()?.replace(/^\*$/, '')?.substring(0, 500);
		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		if (!query) {
			return this.client.autocomplete.clanAutoComplete(interaction, true);
		}

		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const now = Date.now();
		const result = query
			? await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_CLANS },
						{
							query: {
								bool: {
									must: { term: { userId } },
									should: getQuery(query),
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							query: {
								bool: {
									must: { term: { guildId } },
									should: getQuery(query),
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
								bool: { must: { term: { userId } } }
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							size: 25,
							sort: [{ name: 'asc' }],
							query: {
								bool: { must: { term: { guildId } } }
							}
						}
						// { index: ElasticIndex.RECENT_CLANS },
						// {
						// 	sort: [{ lastSearched: 'desc' }],
						// 	query: {
						// 		bool: { must: { term: { userId } } }
						// 	}
						// }
					]
			  });

		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		const clans = (result.responses as MsearchMultiSearchItem<{ name: string; tag: string; guildId?: string; userId?: string }>[])
			.map((res) => res.hits.hits.map((hit) => hit._source!))
			.flat()
			.filter((clan) => clan.name && clan.tag)
			.filter((clan, index, _clans) => _clans.findIndex((p) => p.tag === clan.tag) === index);

		const isValidQuery = this.isValidQuery(query);
		if (!clans.length) {
			if (query && isValidQuery) {
				const value = await this.getQuery(query);
				return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter clan tags or names!' }]);
		}

		const response = clans.slice(0, 24).map((clan) => ({ value: clan.tag, name: `${clan.name} (${clan.tag})` }));
		if (response.length > 1) {
			const clanTags = clans.map((clan) => clan.tag).join(',');
			response.unshift({
				value: isValidQuery ? await this.getQuery(clanTags) : '*',
				name: `All of these (${clans.length})`
			});
		}
		return interaction.respond(response);
	}

	private async clanTagAutocomplete(interaction: AutocompleteInteraction<'cached'>, focused: string) {
		const query = interaction.options.getString(focused)?.trim()?.substring(0, 500);
		this.client.logger.debug(`${interaction.commandName}#${focused} ~ searching for "${query ?? ''}"`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		if (!query) {
			return this.client.autocomplete.clanAutoComplete(interaction, false);
		}

		const now = Date.now();
		const result = query
			? await this.client.elastic.msearch({
					searches: [
						{ index: ElasticIndex.USER_LINKED_CLANS },
						{
							query: {
								bool: {
									must: { term: { userId } },
									should: getQuery(query),
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
									must: { term: { guildId } },
									should: getQuery(query),
									minimum_should_match: 1
								}
							}
						},
						{ index: ElasticIndex.RECENT_CLANS },
						{
							sort: [{ lastSearched: 'desc' }],
							query: {
								bool: {
									must: { term: { userId } },
									should: getQuery(query),
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
									must: { term: { userId } }
								}
							}
						},
						{ index: ElasticIndex.GUILD_LINKED_CLANS },
						{
							size: 25,
							sort: [{ name: 'asc' }],
							query: {
								bool: {
									must: { term: { guildId } }
								}
							}
						},
						{ index: ElasticIndex.RECENT_CLANS },
						{
							sort: [{ lastSearched: 'desc' }],
							query: {
								bool: {
									must: { term: { userId } }
								}
							}
						}
					]
			  });
		this.client.logger.debug(`${interaction.commandName}#${focused} ~ search took ${Date.now() - now}ms`, {
			label: `${interaction.guild.name}/${interaction.user.displayName}`
		});

		const clans = (result.responses as MsearchMultiSearchItem<{ name: string; tag: string; guildId?: string; userId?: string }>[])
			.map((res) => res.hits.hits.map((hit) => hit._source!))
			.flat()
			.filter((clan) => clan.name && clan.tag)
			.filter((clan, index, _clans) => _clans.findIndex((p) => p.tag === clan.tag) === index)
			.slice(0, 25);

		if (!clans.length) {
			if (query && this.isValidQuery(query)) {
				const value = await this.getQuery(query);
				if (value) return interaction.respond([{ value, name: query.substring(0, 100) }]);
			}
			return interaction.respond([{ value: '0', name: 'Enter a clan tag!' }]);
		}
		return interaction.respond(clans.map((clan) => ({ value: clan.tag, name: `${clan.name} (${clan.tag})` })));
	}

	private isValidQuery(query: string) {
		return query.trim();
	}

	private async getQuery(query: string) {
		query = query.trim();
		if (query.length > 100) {
			const key = `ARGS:${nanoid()}`;
			await this.client.redis.connection.set(key, query, { EX: 60 * 60 });
			return key;
		}
		return query;
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
			this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.displayName}]`, { label: 'COMPONENT_BLOCKED' });
			return interaction.reply({ content: this.i18n('common.component.unauthorized', { lng: interaction.locale }), ephemeral: true });
		}

		if (this.client.components.has(interaction.customId)) return;
		if (await this.componentHandler.exec(interaction)) return;

		this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.displayName}] -> ${interaction.customId}`, {
			label: 'COMPONENT_EXPIRED'
		});

		await interaction.update({ components: [] });
		return interaction.followUp({ content: this.i18n('common.component.expired', { lng: interaction.locale }), ephemeral: true });
	}

	private inhibitor(interaction: Interaction) {
		// TODO: ADD MORE CHECKS

		// if (!interaction.inCachedGuild()) return true;
		// if (!interaction.channel) return true;

		const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
		if (interaction.guildId && guilds.includes(interaction.guildId)) return true;

		const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		return users.includes(interaction.user.id);
	}
}
