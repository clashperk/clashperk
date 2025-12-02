import { Collections } from '@app/constants';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import Google from '../../struct/google.js';

export default class TimezoneCommand extends Command {
  public constructor() {
    super('timezone', {
      category: 'profile',
      clientPermissions: ['EmbedLinks'],
      channel: 'guild',
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { location: string }) {
    const raw = await Google.timezone(args.location);
    if (!raw)
      return interaction.editReply(
        this.i18n('command.timezone.no_result', { lng: interaction.locale })
      );

    const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
    await this.client.db.collection(Collections.USERS).updateOne(
      { userId: interaction.user.id },
      {
        $set: {
          username: interaction.user.username,
          displayName: interaction.user.displayName,
          discriminator: interaction.user.discriminator,
          timezone: {
            id: raw.timezone.timeZoneId,
            offset: Number(offset),
            name: raw.timezone.timeZoneName,
            location: raw.location.formatted_address
          }
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${raw.location.formatted_address}`)
      .setDescription(
        [
          `**${raw.timezone.timeZoneName}**`,
          moment(new Date(Date.now() + offset * 1000)).format('MM/DD/YYYY hh:mm A'),
          '',
          '**Offset**',
          `${offset < 0 ? '-' : '+'}${this.timezoneOffset(offset * 1000)}`
        ].join('\n')
      )
      .setFooter({
        text: `${interaction.user.displayName}`,
        iconURL: interaction.user.displayAvatarURL()
      });
    return interaction.editReply({ embeds: [embed] });
  }

  public timezoneOffset(seconds: number, ms = true) {
    seconds = Math.abs(seconds);
    if (ms) seconds /= 1000;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours >= 1 ? `0${hours}`.slice(-2) : '00'}:${minutes >= 1 ? `0${minutes}`.slice(-2) : '00'}`;
  }
}
