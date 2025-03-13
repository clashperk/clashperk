import { FeatureFlags } from '@app/constants';

export interface FeatureFlagsEntity {
  key: FeatureFlags;
  enabled: boolean;
  limited: boolean;
  guildIds: string[];
}
