import { CallableContext, HttpsError } from 'firebase-functions/lib/providers/https';

export function callableHandler(
	fn: (data: any, ctx: CallableContext) => any | Promise<any>,
): (data: any, ctx: CallableContext) => Promise<any | HttpsError> {
	return async (data: any, ctx: CallableContext) => {
		if (data?.ping) {
			return 'pong';
		}
		try {
			return await fn(data, ctx);
		} catch (e) {
			if (e instanceof HttpsError) {
				return e;
			}
			throw e;
		}
	};
}
