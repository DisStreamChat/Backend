type Callback<T> = (error: any, result?: T) => void;

export function promisify<T, A extends any[]>(
	fn: (...args: [...A, Callback<T>]) => void
): (...args: A) => Promise<T> {
	return (...args: A) => {
		return new Promise<T>((resolve, reject) => {
			fn(...args, (error: any, result: T) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	};
}

//
