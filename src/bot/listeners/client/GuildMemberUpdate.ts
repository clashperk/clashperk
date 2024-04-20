import { Settings } from '@app/constants';
import { GuildMember } from 'discord.js';
import { diff, toggle } from 'radash';
import { Listener } from '../../lib/index.js';

export default class GuildMembersChunkListener extends Listener {
	public constructor() {
		super('guildMemberUpdate', {
			emitter: 'client',
			event: 'guildMemberUpdate',
			category: 'client'
		});
	}

	public async exec(oldMember: GuildMember, newMember: GuildMember) {
		const oldRoleIds = oldMember.roles.cache.map((role) => role.id);
		const newRoleIds = newMember.roles.cache.map((role) => role.id);

		if (!diff(oldRoleIds, newRoleIds).length && !diff(newRoleIds, oldRoleIds).length) return null;

		const config = this.client.settings.get<{
			type: 'optIn' | 'optOut';
			wars: string;
			games: string;
			raids: string;
			raidsExclusionUserIds: string[];
			gamesExclusionUserIds: string[];
			warsExclusionUserIds: string[];
		}>(newMember.guild, Settings.REMINDER_EXCLUSION, { type: 'optIn' });

		if (!config.wars && !config.raids && !config.games) return;

		const warsExclusionUserIds = config.warsExclusionUserIds ?? [];
		const gamesExclusionUserIds = config.gamesExclusionUserIds ?? [];
		const raidsExclusionUserIds = config.raidsExclusionUserIds ?? [];

		let didUpdate = false;

		if (config.wars) {
			if (
				(newMember.roles.cache.has(config.wars) && !warsExclusionUserIds.includes(newMember.id)) ||
				(!newMember.roles.cache.has(config.wars) && warsExclusionUserIds.includes(newMember.id))
			) {
				config.warsExclusionUserIds = toggle(warsExclusionUserIds, newMember.id);
				didUpdate = true;
			}
		}

		if (config.games) {
			if (
				(newMember.roles.cache.has(config.games) && !gamesExclusionUserIds.includes(newMember.id)) ||
				(!newMember.roles.cache.has(config.games) && gamesExclusionUserIds.includes(newMember.id))
			) {
				config.gamesExclusionUserIds = toggle(gamesExclusionUserIds, newMember.id);
				didUpdate = true;
			}
		}

		if (config.raids) {
			if (
				(newMember.roles.cache.has(config.raids) && !raidsExclusionUserIds.includes(newMember.id)) ||
				(!newMember.roles.cache.has(config.raids) && raidsExclusionUserIds.includes(newMember.id))
			) {
				config.raidsExclusionUserIds = toggle(raidsExclusionUserIds, newMember.id);
				didUpdate = true;
			}
		}

		if (didUpdate) await this.client.settings.set(newMember.guild, Settings.REMINDER_EXCLUSION, config);
	}
}
