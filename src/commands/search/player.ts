import { Collections, FeatureFlags } from '@app/constants';
import { ClanWarsEntity } from '@app/entities';
import { APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
  User,
  escapeMarkdown
} from 'discord.js';
import ms from 'ms';
import { Command } from '../../lib/handlers.js';
import { EMOJIS, HEROES, SIEGE_MACHINES, TOWN_HALLS } from '../../util/emojis.js';
import { getMenuFromMessage, trimTag } from '../../util/helper.js';
import { Season } from '../../util/toolkit.js';

const roles: Record<string, string> = {
  member: 'Member',
  admin: 'Elder',
  coLeader: 'Co-Leader',
  leader: 'Leader'
};

const weaponLevels: Record<string, string> = {
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵'
};

export default class PlayerCommand extends Command {
  public constructor() {
    super('player', {
      category: 'search',
      channel: 'dm',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async run(message: Message<true>, { tag }: { tag: string }) {
    const { body, res } = await this.client.coc.getPlayer(tag);
    if (!res.ok) return null;
    const embed = (await this.embed(body)).setColor(this.client.embed(message));
    return message.channel.send({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
      reply: { messageReference: message, failIfNotExists: false }
    });
  }

  public async exec(interaction: CommandInteraction | ButtonInteraction, args: { tag?: string; user?: User }) {
    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return;

    const embed = (await this.embed(data)).setColor(this.client.embed(interaction));
    if (!interaction.isMessageComponent()) await interaction.editReply({ embeds: [embed] });
    if (!interaction.inCachedGuild()) return;

    const payload = {
      cmd: this.id,
      tag: data.tag
    };

    const customIds = {
      accounts: JSON.stringify({ ...payload, string_key: 'tag' }),
      refresh: JSON.stringify({ ...payload }),
      units: JSON.stringify({ ...payload, cmd: 'units' }),
      upgrades: JSON.stringify({ ...payload, cmd: 'upgrades' }),
      rushed: JSON.stringify({ ...payload, cmd: 'rushed' }),
      clan: JSON.stringify({ ...payload, cmd: 'clan', tag: data.clan?.tag }),
      history: JSON.stringify({ ...payload, cmd: 'clan-history' })
    };

    const refreshButton = new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh);
    const mainRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(refreshButton)
      .addComponents(new ButtonBuilder().setLabel('Units').setStyle(ButtonStyle.Primary).setCustomId(customIds.units))
      .addComponents(new ButtonBuilder().setLabel('Upgrades').setStyle(ButtonStyle.Primary).setCustomId(customIds.upgrades))
      .addComponents(new ButtonBuilder().setLabel('Rushed').setStyle(ButtonStyle.Primary).setCustomId(customIds.rushed));

    const isHistoryEnabled = await this.client.isFeatureEnabled(FeatureFlags.CLAN_HISTORY, interaction.guildId);
    if (isHistoryEnabled) {
      mainRow.addComponents(
        new ButtonBuilder().setLabel('Clan History').setEmoji(EMOJIS.SCROLL).setStyle(ButtonStyle.Secondary).setCustomId(customIds.history)
      );
    }

    if (interaction.isMessageComponent()) {
      return interaction.editReply({
        embeds: [embed],
        components: [mainRow, ...getMenuFromMessage(interaction, data.tag, customIds.accounts)]
      });
    }

    const players = data.user ? await this.client.resolver.getPlayers(data.user.id) : [];
    const options = players.map((op) => ({
      description: op.tag,
      label: op.name,
      value: op.tag,
      default: op.tag === data.tag,
      emoji: TOWN_HALLS[op.townHallLevel]
    }));

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId(customIds.accounts).setPlaceholder('Select an account!').addOptions(options)
    );

    return interaction.editReply({
      embeds: [embed],
      components: options.length > 1 ? [mainRow, menuRow] : [mainRow]
    });
  }

  private async embed(data: APIPlayer) {
    const aggregated = await this.client.db
      .collection(Collections.PLAYERS)
      .findOne({ tag: data.tag }, { projection: { tag: 1, lastSeen: 1 } });

    const lastSeen = aggregated?.lastSeen ? this.getLastSeen(aggregated.lastSeen) : 'Unknown';
    const clan = data.clan
      ? `**Clan Info**\n${EMOJIS.CLAN} [${data.clan.name}](http://cprk.eu/c/${trimTag(data.clan.tag)}) (${roles[data.role!]})\n`
      : '';

    const war = await this.getWars(data.tag);
    const warStats = `${EMOJIS.CROSS_SWORD} ${war.total} ${EMOJIS.SWORD} ${war.attacks} ${EMOJIS.STAR} ${war.stars} ${
      EMOJIS.THREE_STARS
    } ${war.starTypes.filter((num) => num === 3).length} ${EMOJIS.EMPTY_SWORD} ${war.of - war.attacks}`;
    const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
    const embed = new EmbedBuilder()
      .setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
      .setURL(this.client.coc.getPlayerURL(data.tag))
      .setDescription(
        [
          `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${EMOJIS.EXP} **${data.expLevel}** ${
            EMOJIS.TROPHY
          } **${data.trophies}** ${EMOJIS.WAR_STAR} **${data.warStars}**`
        ].join('\n')
      );
    if (data.league?.iconUrls.small) embed.setThumbnail(data.league?.iconUrls.small);

    embed.addFields([
      {
        name: '**Season Stats**',
        value: [
          `**Donated**\n${EMOJIS.TROOPS_DONATE} ${data.donations.toLocaleString()} ${EMOJIS.UP_KEY}`,
          `**Received**\n${EMOJIS.TROOPS_DONATE} ${data.donationsReceived.toLocaleString()} ${EMOJIS.DOWN_KEY}`,
          `**Attacks Won**\n${EMOJIS.SWORD} ${data.attackWins}`,
          `**Defense Won**\n${EMOJIS.SHIELD} ${data.defenseWins}${war.total > 0 ? `\n**War Stats**\n${warStats}` : ''}`,
          `[View war attack history](https://clashperk.com/players/${encodeURIComponent(data.tag)}/wars)`,
          '\u200b\u2002'
        ].join('\n')
      }
    ]);
    embed.addFields([
      {
        name: '**Other Stats**',
        value: [
          `**Best Trophies**\n${EMOJIS.TROPHY} ${data.bestTrophies}`,
          `${clan}**Last Seen**\n${EMOJIS.CLOCK} ${lastSeen}`,
          '\u200b\u2002'
        ].join('\n')
      }
    ]);

    // convert achievements to object
    const achievements: Record<string, number> = {};
    for (const achievement of data.achievements) {
      achievements[achievement.name] = achievement.value;
    }

    embed.addFields([
      {
        name: '**Achievement Stats**',
        value: [
          '**Total Loots**',
          [
            `${EMOJIS.GOLD} ${this.format(achievements['Gold Grab'])}`,
            `${EMOJIS.ELIXIR} ${this.format(achievements['Elixir Escapade'])}`,
            `${EMOJIS.DARK_ELIXIR} ${this.format(achievements['Heroic Heist'])}`
          ].join(' '),
          `**Troops Donated**\n${EMOJIS.TROOPS_DONATE} ${achievements['Friend in Need'].toLocaleString()}`,
          `**Spells Donated**\n${EMOJIS.SPELL_DONATE} ${achievements['Sharing is caring'].toLocaleString()}`,
          `**Siege Donated**\n${SIEGE_MACHINES['Wall Wrecker']} ${achievements['Siege Sharer'].toLocaleString()}`,
          `**Attacks Won**\n${EMOJIS.SWORD} ${achievements['Conqueror'].toLocaleString()}`,
          `**Defense Won**\n${EMOJIS.SHIELD} ${achievements['Unbreakable'].toLocaleString()}`,
          `**CWL War Stars**\n${EMOJIS.STAR} ${achievements['War League Legend'].toLocaleString()}`,
          `**Clan Games Points**\n${EMOJIS.CLAN_GAMES} ${achievements['Games Champion'].toLocaleString()}`,
          `**Capital Gold Looted**\n${EMOJIS.CAPITAL_GOLD} ${achievements['Aggressive Capitalism'].toLocaleString()}`,
          `**Capital Gold Contributed**\n${EMOJIS.CAPITAL_GOLD} ${achievements['Most Valuable Clanmate'].toLocaleString()}`,
          '\u200b\u2002'
        ].join('\n')
      }
    ]);

    const heroes = data.heroes.filter((hero) => hero.village === 'home').map((hero) => `${HEROES[hero.name]} ${hero.level}`);
    embed.addFields([
      { name: '**Heroes**', value: [`${heroes.length ? heroes.join(' ') : `${EMOJIS.WRONG} None`}`, '\u200b\u2002'].join('\n') }
    ]);

    const user = await this.getLinkedUser(data.tag);
    if (user) {
      embed.addFields([{ name: '**Discord**', value: user.mention ?? `${EMOJIS.OK} Connected` }]);
    } else {
      embed.addFields([{ name: '**Discord**', value: `${EMOJIS.WRONG} Not Found` }]);
    }

    return embed;
  }

  private format(num = 0) {
    // Nine Zeroes for Billions
    return Math.abs(num) >= 1.0e9
      ? `${(Math.abs(num) / 1.0e9).toFixed(2)}B`
      : // Six Zeroes for Millions
        Math.abs(num) >= 1.0e6
        ? `${(Math.abs(num) / 1.0e6).toFixed(2)}M`
        : // Three Zeroes for Thousands
          Math.abs(num) >= 1.0e3
          ? `${(Math.abs(num) / 1.0e3).toFixed(2)}K`
          : Math.abs(num).toFixed(2);
  }

  private async getWars(tag: string) {
    const member = {
      tag,
      total: 0,
      of: 0,
      attacks: 0,
      stars: 0,
      dest: 0,
      defStars: 0,
      defDestruction: 0,
      starTypes: [] as number[],
      defCount: 0
    };

    const wars = await this.client.db
      .collection<ClanWarsEntity>(Collections.CLAN_WARS)
      .find({
        startTime: { $gte: Season.startTimestamp },
        $or: [{ 'clan.members.tag': tag }, { 'opponent.members.tag': tag }],
        state: { $in: ['inWar', 'warEnded'] }
      })
      .sort({ _id: -1 })
      .toArray();

    for (const data of wars) {
      const clan = data.clan.members.find((m) => m.tag === tag) ? data.clan : data.opponent;
      member.total += 1;
      for (const m of clan.members) {
        if (m.tag !== tag) continue;
        member.of += data.attacksPerMember ?? 2;

        if (m.attacks?.length) {
          member.attacks += m.attacks.length;
          member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
          member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
          member.starTypes.push(...m.attacks.map((atk) => atk.stars));
        }

        if (m.bestOpponentAttack) {
          member.defStars += m.bestOpponentAttack.stars;
          member.defDestruction += m.bestOpponentAttack.destructionPercentage;
          member.defCount += 1;
        }
      }
    }

    return member;
  }

  private getLastSeen(lastSeen: Date) {
    const timestamp = Date.now() - lastSeen.getTime();
    return timestamp <= 1 * 24 * 60 * 60 * 1000
      ? 'Today'
      : timestamp <= 2 * 24 * 60 * 60 * 1000
        ? 'Yesterday'
        : `${ms(timestamp, { long: true })} ago`;
  }

  private async getLinkedUser(tag: string) {
    const data = await Promise.any([this.getLinkedFromDb(tag), this.client.coc.getLinkedUser(tag)]);
    if (!data) return null;

    return { mention: `<@${data.userId}>`, userId: data.userId };
  }

  private async getLinkedFromDb(tag: string) {
    const data = await this.client.db.collection(Collections.PLAYER_LINKS).findOne({ tag });
    if (!data) return Promise.reject(0);
    return data;
  }
}
