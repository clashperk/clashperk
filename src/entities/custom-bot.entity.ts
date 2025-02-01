export interface CustomBotsEntity {
  serviceId: string;
  createdAt: Date;
  name: string;
  token: string;
  containerId: string;
  isProd: boolean;
  isDisabled: boolean;
  isRunning: boolean;

  userId: string;
  patronId: string;
  guildIds: string[];
  isLive: boolean;
  updatedAt: Date;
}
