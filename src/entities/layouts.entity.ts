export interface LayoutsEntity {
  layoutId: string;
  guildId: string;
  messageIds: string[];
  label: string;
  notes: string | null;
  link: string;
  imageUrl: string;
  userId: string;
  downloader: string[];
  votes: {
    up: string[];
    down: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
