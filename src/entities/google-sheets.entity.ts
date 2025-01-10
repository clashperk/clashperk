export interface GoogleSheetsEntity {
  sheetType: SheetType;
  guildId: string;
  hash: string;
  sheetHash: string;
  exported: number;
  spreadsheetId: string;
  sheetCount: number;
  clanTags: string[];
  updatedAt: Date;
  createdAt: Date;
}

export enum SheetType {
  CLAN_MEMBERS = 'CLAN_MEMBERS',
  REGULAR_WARS = 'REGULAR_WARS',
  COMBINED_WARS = 'COMBINED_WARS',
  FRIENDLY_WARS = 'FRIENDLY_WARS',
  CWL_WARS = 'CWL_WARS',
  ATTACK_LOG = 'ATTACK_LOG',
  SEASON = 'SEASON',
  ROSTERS = 'ROSTERS',
  CLANS = 'CLANS'
}
