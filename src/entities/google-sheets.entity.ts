export interface GoogleSheetsEntity {
  sheetType: SheetType;
  guildId: string;
  sha: string;
  exported: number;
  spreadsheetId: string;
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
  SEASON = 'SEASON'
}
