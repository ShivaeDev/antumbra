import { type AppRouter, type SubscriptionMessage, subscriptionChannel, TRPC_SUBSCRIBE_CHANNEL, TRPC_UNSUBSCRIBE_CHANNEL } from "@antumbra/contract";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { Schema } from "effect";
import { ipcMain } from "electron";
import { makeTrpcSubscriptionHandlers, type SubscriptionSender } from "#adapters/trpc-subscription-handlers.ts";
import type { WindowRegistry } from "#adapters/windows/registry.ts";

const SubscriptionProcedureResult = Schema.declare(
	(value): value is AsyncIterable<unknown> =>
		typeof value === "object" && value !== null && Symbol.asyncIterator in value && typeof value[Symbol.asyncIterator] === "function",
);
const decodeSubscriptionProcedureResult = Schema.decodeUnknownSync(SubscriptionProcedureResult);

const pump = async (sender: SubscriptionSender, id: string, iterable: AsyncIterable<unknown>, signal: AbortSignal): Promise<void> => {
	const send = (message: SubscriptionMessage) => {
		if (!sender.isDestroyed()) {
			sender.send(subscriptionChannel(id), message);
		}
	};
	const iterator = iterable[Symbol.asyncIterator]();
	// return() settles a pending next() when the subscription ignores AbortSignal.
	signal.addEventListener("abort", () => {
		void iterator.return?.();
	});
	try {
		while (!signal.aborted) {
			const step = await iterator.next();
			if (step.done) {
				break;
			}
			send({ data: step.value, type: "data" });
		}
		if (!signal.aborted) {
			send({ type: "done" });
		}
	} catch (cause) {
		if (!signal.aborted) {
			send({ message: getTRPCErrorFromUnknown(cause).message, type: "error" });
		}
	}
};

export const registerTrpcSubscriptions = (router: AppRouter, registry: WindowRegistry): void => {
	const handlers = makeTrpcSubscriptionHandlers(registry, async (sender, windowId, request, signal) => {
		const iterable = decodeSubscriptionProcedureResult(
			await callTRPCProcedure({
				batchIndex: 0,
				ctx: { windowId },
				getRawInput: () => Promise.resolve(request.input),
				path: request.path,
				router,
				signal,
				type: "subscription",
			}),
		);
		await pump(sender, request.id, iterable, signal);
	});
	ipcMain.on(TRPC_SUBSCRIBE_CHANNEL, handlers.subscribe);
	ipcMain.on(TRPC_UNSUBSCRIBE_CHANNEL, handlers.unsubscribe);
};
