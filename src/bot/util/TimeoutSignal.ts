const signalMap = new WeakMap();

const TimeoutSignal = (timeout: number) => {
	if (!Number.isInteger(timeout)) {
		throw new TypeError(`Expected an integer, got ${typeof timeout}`);
	}

	const controller = new AbortController();

	const timeoutId = setTimeout(() => {
		controller.abort();
	}, timeout);

	signalMap.set(controller.signal, timeoutId);

	return controller.signal;
};

export const clear = (signal: AbortSignal) => {
	clearTimeout(signalMap.get(signal));
};

export default TimeoutSignal;
