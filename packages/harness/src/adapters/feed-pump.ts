import type { SubscriptionMessage } from "@antumbra/contract";
import { getTRPCErrorFromUnknown } from "@trpc/server";

export type Deliver = (message: SubscriptionMessage) => void;

export const isAsyncIterable = (
	value: unknown,
): value is AsyncIterable<unknown> =>
	typeof value === "object" &&
	value !== null &&
	Symbol.asyncIterator in value &&
	typeof value[Symbol.asyncIterator] === "function";

export const pump = async (
	iterable: AsyncIterable<unknown>,
	deliver: Deliver,
	signal: AbortSignal,
): Promise<void> => {
	const iterator = iterable[Symbol.asyncIterator]();
	// why: the feed must stop even if the signal is ignored downstream —
	// return() settles a pending next() so an abandoned subscription cannot
	// keep emitting into a view that is already gone.
	signal.addEventListener("abort", () => {
		void iterator.return?.();
	});
	try {
		while (!signal.aborted) {
			const step = await iterator.next();
			if (step.done) {
				break;
			}
			deliver({ data: step.value, type: "data" });
		}
		if (!signal.aborted) {
			deliver({ type: "done" });
		}
	} catch (cause) {
		if (!signal.aborted) {
			deliver({
				message: getTRPCErrorFromUnknown(cause).message,
				type: "error",
			});
		}
	}
};
