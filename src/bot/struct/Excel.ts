import Excel from 'exceljs';

export default class Workbook extends Excel.Workbook {
	public constructor() {
		super();
		this.creator = 'ClashPerk LLC';
		this.lastModifiedBy = 'ClashPerk LLC';
		this.created = new Date();
		this.modified = new Date();
		this.lastPrinted = new Date();
		this.views = [
			{
				x: 0, y: 0, width: 10000, height: 20000,
				firstSheet: 0, activeTab: 1, visibility: 'visible'
			}
		];
	}
}
