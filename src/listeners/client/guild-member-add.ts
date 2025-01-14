import { Settings } from '@app/constants';
import { GuildMember } from 'discord.js';
import { Listener } from '../../lib/handlers.js';
import { Util } from '../../util/toolkit.js';

export default class GuildMemberAddListener extends Listener {
  public constructor() {
    super('guildMemberAdd', {
      emitter: 'client',
      event: 'guildMemberAdd',
      category: 'client'
    });
  }

  public async exec(member: GuildMember) {
    if (this.client.settings.hasCustomBot(member.guild) && !this.client.isCustom()) return;

    if (this.client.settings.get(member.guild, Settings.USE_AUTO_ROLE, true)) {
      await Util.delay(3000);
      const autoRoleAllowNotLinked = this.client.settings.get<boolean>(member.guild, Settings.AUTO_ROLE_ALLOW_NOT_LINKED, true);
      await this.client.rolesManager.updateOne(member.user, member.guild.id, true, autoRoleAllowNotLinked);
    }
  }
}
