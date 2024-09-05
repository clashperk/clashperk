export interface CallersEntity {
  warId: string;
  tag: string;
  name: string;
  caller: Record<
    string,
    {
      offenseMap: number;
      defenseMap: number;
      note: string;
      hours: number;
    }
  >;
}
