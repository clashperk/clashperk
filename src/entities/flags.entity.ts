export interface FlagsEntity {
  guild: string;
  user: string;
  flagType: 'ban' | 'strike';
  flagImpact: number;
  username: string;
  displayName: string;
  discriminator: string;
  tag: string;
  name: string;
  reason: string;
  expiresAt: Date | null;
  createdAt: Date;
}
