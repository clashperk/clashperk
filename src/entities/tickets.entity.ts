import { ObjectId } from 'mongodb';

export interface TicketTypeConfig {
  id: string;
  label: string;
  emoji?: string;
  requireLinkedAccount: boolean;
  thMin?: number;
  maxAccounts?: number;
  heroRequirements?: { name: string; level: number }[];
  minWarStars?: number;
  questions?: { label: string; placeholder?: string; required: boolean }[];
  pingRoleIds: string[];
  viewOnlyRoleIds: string[];
  addRoleIds: string[];
  removeRoleIds: string[];
  openCategoryId?: string;
  sleepCategoryId?: string;
  closedCategoryId?: string;
  namingConvention: string;
  createStaffThread: boolean;
}

export interface TicketPanelEntity {
  _id: ObjectId;
  guildId: string;
  name: string;
  embed: {
    title?: string;
    description?: string;
    color?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
    footerText?: string;
  };
  button: {
    label: string;
    emoji?: string;
    style: number;
  };
  ticketTypes: TicketTypeConfig[];
  logChannels: {
    buttonClick?: string;
    statusChange?: string;
    ticketClose?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketGuildSettingsEntity {
  _id: ObjectId;
  guildId: string;
  savedReplies: { name: string; content: string }[];
  updatedAt: Date;
}

export interface TicketEntity {
  _id: ObjectId;
  count: number;
  guildId: string;
  channelId: string;
  threadId?: string;
  panelId: string;
  buttonId: string;
  creatorId: string;
  accountTag?: string;
  accountName?: string;
  accountTh?: number;
  answers?: { question: string; answer: string }[];
  clanTag?: string;
  clanName?: string;
  status: 'open' | 'sleep' | 'closed';
  notifyMeUserIds: string[];
  transcriptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closedBy?: string;
}
