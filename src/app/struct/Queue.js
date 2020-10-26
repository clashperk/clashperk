class Queue {
	constructor() {
		this.queues = [];
	}

	get remaining() {
		return this.queues.length;
	}

	wait() {
		const next = this.queues.length ? this.queues[this.queues.length - 1].promise : Promise.resolve();
		let resolve;
		const promise = new Promise(res => {
			resolve = res;
		});

		this.queues.push({
			resolve,
			promise
		});

		return next;
	}

	shift() {
		const fn = this.queues.shift();
		if (typeof fn !== 'undefined') fn.resolve();
	}
}

module.exports = Queue;
