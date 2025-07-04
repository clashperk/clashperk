import { CustomTiers } from '../struct/patreon-handler.js';

export interface PatreonMembersEntity {
  id: string;
  name: string;
  rewardId: string;

  userId: string;
  username: string;

  guilds: {
    id: string;
    name: string;
    limit: number;
  }[];
  redeemed: boolean;

  active: boolean;
  declined: boolean;
  cancelled: boolean;

  entitledAmount: number;
  lifetimeSupport: number;

  isGifted: boolean;
  isLifetime: boolean;
  note: CustomTiers;
  patronStatus: string;

  applicationId?: string;

  lastChargeDate: Date;
  createdAt: Date;
}
