const Excel = require('exceljs');
const moment = require('moment');

class Workbook extends Excel.Workbook {
	constructor() {
		super();
		this.creator = 'ClashPerk';
		this.lastModifiedBy = 'ClashPerk';
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

class ExcelHandler {
	static get Excel() {
		return new Workbook();
	}

	static async memberList(members = []) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Member List');

		sheet.columns = [
			{ header: 'NAME', key: 'name', width: 16 },
			{ header: 'TAG', key: 'tag', width: 16 },
			{ header: 'Town-Hall', key: 'townHallLevel', width: 10 },
			{ header: 'BK', key: 'Barbarian King', width: 10 },
			{ header: 'AQ', key: 'Archer Queen', width: 10 },
			{ header: 'GW', key: 'Grand Warden', width: 10 },
			{ header: 'RC', key: 'Royal Champion', width: 10 }
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getColumn(1).alignment = { horizontal: 'left' };
		sheet.getColumn(2).alignment = { horizontal: 'left' };
		sheet.getColumn(3).alignment = { horizontal: 'right' };
		sheet.getColumn(4).alignment = { horizontal: 'right' };
		sheet.getColumn(5).alignment = { horizontal: 'right' };
		sheet.getColumn(6).alignment = { horizontal: 'right' };
		sheet.getColumn(7).alignment = { horizontal: 'right' };
		sheet.addRows([
			...members.map(m => [m.name, m.tag, m.townHallLevel, ...m.heroes.map(h => h.level)])
		]);

		return workbook.xlsx.writeBuffer();
	}

	static async flagList(members = []) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Flag List');

		sheet.columns = [
			{ header: 'NAME', key: 'name', width: 16 },
			{ header: 'TAG', key: 'tag', width: 16 },
			{ header: 'AUTHOR', key: 'author', width: 20 },
			{ header: 'DATE (UTC)', key: 'date', width: 30 },
			{ header: 'REASON', key: 'reason', width: 50 }
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.addRows([
			...members.map(m => ({
				name: m.name,
				tag: m.tag,
				author: m.user_tag,
				date: moment(new Date(m.createdAt)).format('DD MMMM YYYY kk:mm:ss'),
				reason: m.reason
			}))
		]);

		return workbook.xlsx.writeBuffer();
	}
}

module.exports = ExcelHandler;
