import {
	type AppRouter,
	type SubscriptionMessage,
	subscriptionChannel,
	TRPC_SUBSCRIBE_CHANNEL,
	TRPC_UNSUBSCRIBE_CHANNEL,
} from "@antumbra/contract";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { Schema } from "effect";
import { ipcMain } from "electron";
import type { MainDocumentAuthority } from "#adapters/main-document-authority.ts";
import {
	makeTrpcSubscriptionHandlers,
	type SubscriptionSender,
} from "#adapters/trpc-subscription-handlers.ts";

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
	sender: SubscriptionSender,
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
		if (!signal.aborted) {
			send({ type: "done" });
		}
	} catch (cause) {
		if (!signal.aborted) {
			send({ message: getTRPCErrorFromUnknown(cause).message, type: "error" });
		}
	}
};

export const registerTrpcSubscriptions = (
	router: AppRouter,
	authority: MainDocumentAuthority,
): void => {
	const handlers = makeTrpcSubscriptionHandlers(
		authority,
		async (sender, request, signal) => {
			const iterable = decodeSubscriptionProcedureResult(
				await callTRPCProcedure({
					batchIndex: 0,
					ctx: { senderId: sender.id },
					getRawInput: () => Promise.resolve(request.input),
					path: request.path,
					router,
					signal,
					type: "subscription",
				}),
			);
			await pump(sender, request.id, iterable, signal);
		},
	);
	ipcMain.on(TRPC_SUBSCRIBE_CHANNEL, handlers.subscribe);
	ipcMain.on(TRPC_UNSUBSCRIBE_CHANNEL, handlers.unsubscribe);
};
