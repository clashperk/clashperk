import { Collections } from '@app/constants';
import { CallersEntity } from '@app/entities';
import { APIClanWar } from 'clashofclans.js';
import { CommandInteraction, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';

export default class TargetCommand extends Command {
  public constructor() {
    super('caller', {
      aliases: ['caller-assign', 'caller-clear'],
      category: 'war',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { tag?: string; user?: User; offense_target: number; defense_target: number; note?: string; hours?: number; command: string }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    if (clan.members < 1) {
      return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
    }

    const { res, body: war } = await this.client.http.getCurrentWar(clan.tag);
    if (!res.ok) {
      return interaction.editReply('There is no war going on.');
    }
    if (war.state === 'notInWar') {
      return interaction.editReply('There is no war going on.');
    }

    const warId = this.createWarId(war);
    const offenseTags = war.clan.members.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => m.tag);
    const defenseTags = war.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => m.tag);

    if (args.defense_target > defenseTags.length) {
      return interaction.editReply('Invalid defensive target.');
    }

    if (args.command === 'clear') {
      await this.client.db.collection<CallersEntity>(Collections.WAR_BASE_CALLS).updateOne(
        { warId, guild: interaction.guildId },
        {
          $unset: {
            [`caller.${defenseTags[args.defense_target - 1]}-${args.defense_target}`]: ''
          }
        }
      );

      return interaction.editReply(`Cleared **#${args.defense_target}**`);
    }

    if (args.offense_target > offenseTags.length) {
      return interaction.editReply('Invalid offensive target.');
    }

    const offense = offenseTags[args.offense_target - 1];
    const defense = defenseTags[args.defense_target - 1];
    const member = war.clan.members.find((m) => m.tag === offense)!;
    const opponent = war.opponent.members.find((m) => m.tag === defense)!;

    await this.client.db.collection<CallersEntity>(Collections.WAR_BASE_CALLS).updateOne(
      { warId, guild: interaction.guildId },
      {
        $set: {
          name: clan.name,
          tag: clan.tag,
          [`caller.${opponent.tag}-${opponent.mapPosition}`]: {
            offenseMap: args.offense_target,
            defenseMap: args.defense_target,
            defenseTag: defense,
            offenseTag: offense,
            note: member.name,
            hours: args.hours
          }
        }
      },
      { upsert: true }
    );

    return interaction.editReply({
      content: `**#${args.offense_target} ${member.name} (Town Hall ${member.townhallLevel})** was assigned to **#${args.defense_target} ${opponent.name} (Town Hall ${opponent.townhallLevel})**`
    });
  }

  private toDate(ISO: string) {
    return new Date(moment(ISO).toDate());
  }

  private createWarId(data: APIClanWar) {
    const ISO = this.toDate(data.preparationStartTime).toISOString().slice(0, 16);
    return `${ISO}-${[data.clan.tag, data.opponent.tag].sort((a, b) => a.localeCompare(b)).join('-')}`;
  }
}
