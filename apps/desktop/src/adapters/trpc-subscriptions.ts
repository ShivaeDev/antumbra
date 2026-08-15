import {
	type AppRouter,
	SubscribeRequest,
	type SubscriptionMessage,
	subscriptionChannel,
	TRPC_SUBSCRIBE_CHANNEL,
	TRPC_UNSUBSCRIBE_CHANNEL,
	UnsubscribeRequest,
} from "@antumbra/contract";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { Result, Schema } from "effect";
import { ipcMain, type WebContents } from "electron";

const decodeSubscribe = Schema.decodeUnknownResult(SubscribeRequest);
const decodeUnsubscribe = Schema.decodeUnknownResult(UnsubscribeRequest);

const SubscriptionProcedureResult = Schema.declare(
	(value): value is AsyncIterable<unknown> =>
		typeof value === "object" &&
		value !== null &&
		Symbol.asyncIterator in value &&
		typeof value[Symbol.asyncIterator] === "function",
);
const decodeSubscriptionProcedureResult = Schema.decodeUnknownSync(
	SubscriptionProcedureResult,
);

const pump = async (
	sender: WebContents,
	id: string,
	iterable: AsyncIterable<unknown>,
	signal: AbortSignal,
): Promise<void> => {
	const send = (message: SubscriptionMessage) => {
		if (!sender.isDestroyed()) {
			sender.send(subscriptionChannel(id), message);
		}
	};
	const iterator = iterable[Symbol.asyncIterator]();
	// why: the stream must stop even if the signal is ignored downstream —
	// return() settles a pending next() so an aborted feed cannot leak.
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
		send({ type: "done" });
	} catch (cause) {
		if (!signal.aborted) {
			send({ message: getTRPCErrorFromUnknown(cause).message, type: "error" });
		}
	}
};

export const registerTrpcSubscriptions = (router: AppRouter): void => {
	const bySender = new Map<number, Map<string, AbortController>>();

	const dropSender = (senderId: number) => {
		const live = bySender.get(senderId);
		if (live === undefined) {
			return;
		}
		bySender.delete(senderId);
		for (const controller of live.values()) {
			controller.abort();
		}
	};

	const track = (sender: WebContents, id: string) => {
		const controller = new AbortController();
		const senderId = sender.id;
		let live = bySender.get(senderId);
		if (live === undefined) {
			live = new Map();
			bySender.set(senderId, live);
			sender.once("destroyed", () => dropSender(senderId));
			// why: a reload resets the renderer context — its listeners are gone,
			// so every subscription of the old page must die with it.
			sender.on("did-start-navigation", () => dropSender(senderId));
		}
		live.set(id, controller);
		return controller;
	};

	ipcMain.on(TRPC_SUBSCRIBE_CHANNEL, (event, raw: unknown) => {
		const decoded = decodeSubscribe(raw);
		if (Result.isFailure(decoded)) {
			return;
		}
		const request = decoded.success;
		const controller = track(event.sender, request.id);
		void (async () => {
			try {
				const iterable = decodeSubscriptionProcedureResult(
					await callTRPCProcedure({
						batchIndex: 0,
						ctx: { senderId: event.sender.id },
						getRawInput: () => Promise.resolve(request.input),
						path: request.path,
						router,
						signal: controller.signal,
						type: "subscription",
					}),
				);
				await pump(event.sender, request.id, iterable, controller.signal);
			} catch (cause) {
				if (!event.sender.isDestroyed()) {
					event.sender.send(subscriptionChannel(request.id), {
						message: getTRPCErrorFromUnknown(cause).message,
						type: "error",
					} satisfies SubscriptionMessage);
				}
			} finally {
				bySender.get(event.sender.id)?.delete(request.id);
			}
		})();
	});

	ipcMain.on(TRPC_UNSUBSCRIBE_CHANNEL, (event, raw: unknown) => {
		const decoded = decodeUnsubscribe(raw);
		if (Result.isFailure(decoded)) {
			return;
		}
		const live = bySender.get(event.sender.id);
		const controller = live?.get(decoded.success.id);
		if (controller !== undefined) {
			live?.delete(decoded.success.id);
			controller.abort();
		}
	});
};
