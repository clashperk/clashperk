import { GuildMember } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

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
			return this.client.rolesManager.updateOne(member.id, member.guild.id);
		}
	}
}
