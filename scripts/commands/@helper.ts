import { ApplicationIntegrationType, ChannelType, InteractionContextType } from 'discord.js';
import i18next from 'i18next';
import moment from 'moment';
import { fileURLToPath } from 'url';
import { Backend } from '../../src/util/i18n.backend.js';
import { defaultOptions, fallbackLng } from '../../src/util/i18n.config.js';
import { TranslationKey } from '../../src/util/i18n.js';
import { Util } from '../../src/util/toolkit.js';

const locales = new URL('../../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
  ...defaultOptions,
  backend: { paths: [fileURLToPath(locales)] }
});

export function getSeasonIds() {
  return Util.getSeasonIds().map((seasonId) => {
    return { name: moment(seasonId, 'YYYY-MM').format('MMM YYYY'), value: seasonId };
  });
}

export function getSeasonSinceIds() {
  return getSeasonIds().map((season) => ({ name: `Since ${season.name}`, value: season.value }));
}

export function getRaidWeekIds() {
  const weekIds: { name: string; value: string }[] = [];
  const friday = moment().endOf('month').day('Friday').startOf('day');
  while (weekIds.length < 6) {
    if (friday.toDate().getTime() < Date.now()) {
      weekIds.push({ name: friday.format('DD MMM, YYYY'), value: friday.format('YYYY-MM-DD') });
    }
    friday.subtract(7, 'd');
  }
  return weekIds;
}

export const channelTypes: Exclude<ChannelType, ChannelType.DM | ChannelType.GuildDirectory | ChannelType.GroupDM>[] = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.GuildMedia
];

export const userInstallable = {
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel]
};

export const translation = (text: TranslationKey): Record<string, string> => {
  return Object.keys(fallbackLng).reduce<Record<string, string>>((record, lang) => {
    record[lang] = i18next.t(text, { lng: lang, escapeValue: false });
    return record;
  }, {});
};
