class Queue {
	constructor() {
		this.promises = [];
		this.totalReq = 0;
	}

	get remaining() {
		return this.promises.length;
	}

	wait() {
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

	shift() {
		const fn = this.promises.shift();
		if (typeof fn !== 'undefined') fn.resolve();
	}
}

module.exports = Queue;
