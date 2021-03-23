export default class Queue {
	public promises: any[];
	public totalReq: number;

	public constructor() {
		this.promises = [];
		this.totalReq = 0;
	}

	public get remaining() {
		return this.promises.length;
	}

	public wait() {
		const next = this.promises.length ? this.promises[this.promises.length - 1].promise : Promise.resolve();
		let resolve;
		const promise = new Promise(res => {
			resolve = res;
		});

		this.promises.push({
			resolve,
			promise
		});

		this.totalReq++;
		return next;
	}

	public shift() {
		const fn = this.promises.shift();
		if (typeof fn !== 'undefined') fn.resolve();
	}
}
