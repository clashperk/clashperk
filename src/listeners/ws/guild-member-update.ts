import { APIUser } from 'discord.js';
import { toggle } from 'radash';
import { Listener } from '../../lib/handlers.js';
import { Settings } from '../../util/constants.js';

export default class GuildMemberUpdateListener extends Listener {
  public constructor() {
    super('guildMemberUpdate', {
      emitter: 'ws',
      event: 'GUILD_MEMBER_UPDATE',
      category: 'client'
    });
  }

  public async exec(newMember: { guild_id: string; user: APIUser; roles: string[] }) {
    const config = this.client.settings.get<{
      type: 'optIn' | 'optOut';
      wars: string;
      games: string;
      raids: string;
      raidsExclusionUserIds: string[];
      gamesExclusionUserIds: string[];
      warsExclusionUserIds: string[];
    }>(newMember.guild_id, Settings.REMINDER_EXCLUSION, { type: 'optIn' });

    if (!config.wars && !config.raids && !config.games) return;

    const warsExclusionUserIds = config.warsExclusionUserIds ?? [];
    const gamesExclusionUserIds = config.gamesExclusionUserIds ?? [];
    const raidsExclusionUserIds = config.raidsExclusionUserIds ?? [];

    let updated = false;

    if (config.wars) {
      if (
        (newMember.roles.includes(config.wars) && !warsExclusionUserIds.includes(newMember.user.id)) ||
        (!newMember.roles.includes(config.wars) && warsExclusionUserIds.includes(newMember.user.id))
      ) {
        config.warsExclusionUserIds = toggle(warsExclusionUserIds, newMember.user.id);
        updated = true;
      }
    }

    if (config.games) {
      if (
        (newMember.roles.includes(config.games) && !gamesExclusionUserIds.includes(newMember.user.id)) ||
        (!newMember.roles.includes(config.games) && gamesExclusionUserIds.includes(newMember.user.id))
      ) {
        config.gamesExclusionUserIds = toggle(gamesExclusionUserIds, newMember.user.id);
        updated = true;
      }
    }

    if (config.raids) {
      if (
        (newMember.roles.includes(config.raids) && !raidsExclusionUserIds.includes(newMember.user.id)) ||
        (!newMember.roles.includes(config.raids) && raidsExclusionUserIds.includes(newMember.user.id))
      ) {
        config.raidsExclusionUserIds = toggle(raidsExclusionUserIds, newMember.user.id);
        updated = true;
      }
    }

    if (updated) {
      await this.client.settings.set(newMember.guild_id, Settings.REMINDER_EXCLUSION, config);
    }
  }
}
