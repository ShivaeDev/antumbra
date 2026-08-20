import {
	SubscribeRequest,
	type SubscriptionMessage,
	subscriptionChannel,
	UnsubscribeRequest,
} from "@antumbra/contract";
import { getTRPCErrorFromUnknown } from "@trpc/server";
import { Result, Schema } from "effect";
import type {
	DocumentContents,
	DocumentIpcEvent,
	WindowRegistry,
} from "#adapters/windows/registry.ts";

const decodeSubscribe = Schema.decodeUnknownResult(SubscribeRequest);
const decodeUnsubscribe = Schema.decodeUnknownResult(UnsubscribeRequest);

export interface SubscriptionSender extends DocumentContents {
	readonly id: number;
	readonly on: (name: "did-start-navigation", listener: () => void) => void;
	readonly once: (name: "destroyed", listener: () => void) => void;
	readonly send: (channel: string, message: SubscriptionMessage) => void;
}

interface SubscriptionEvent extends DocumentIpcEvent {
	readonly sender: SubscriptionSender;
}

type StartSubscription = (
	sender: SubscriptionSender,
	windowId: string,
	request: typeof SubscribeRequest.Type,
	signal: AbortSignal,
) => Promise<void>;

export const makeTrpcSubscriptionHandlers = (
	registry: WindowRegistry,
	start: StartSubscription,
) => {
	const bySender = new Map<number, Map<string, AbortController>>();

	const dropSender = (senderId: number) => {
		const live = bySender.get(senderId);
		if (live === undefined) {
			return;
		}
		for (const controller of live.values()) {
			controller.abort();
		}
	};

	const track = (sender: SubscriptionSender, id: string) => {
		const senderId = sender.id;
		let live = bySender.get(senderId);
		if (live?.has(id) === true) {
			return undefined;
		}
		const controller = new AbortController();
		if (live === undefined) {
			live = new Map();
			bySender.set(senderId, live);
			// why: the pair below is attached for as long as the sender lives, so
			// the entry recording it has to live that long too — dropping the entry
			// when the last subscription ends would attach a fresh pair on the next
			// subscribe and pile them up on one webContents, which reaches Node's
			// listener warning after a handful of view changes or reloads.
			sender.once("destroyed", () => {
				dropSender(senderId);
				bySender.delete(senderId);
			});
			// why: a reload resets the renderer context — its listeners are gone,
			// so every subscription of the old page must die with it.
			sender.on("did-start-navigation", () => dropSender(senderId));
		}
		live.set(id, controller);
		return controller;
	};

	const subscribe = (event: SubscriptionEvent, raw: unknown): void => {
		const record = registry.owner(event);
		if (record === undefined) {
			return;
		}
		const decoded = decodeSubscribe(raw);
		if (Result.isFailure(decoded)) {
			return;
		}
		const request = decoded.success;
		const controller = track(event.sender, request.id);
		if (controller === undefined) {
			return;
		}
		void start(event.sender, record.id, request, controller.signal)
			.catch((cause: unknown) => {
				if (!event.sender.isDestroyed()) {
					event.sender.send(subscriptionChannel(request.id), {
						message: getTRPCErrorFromUnknown(cause).message,
						type: "error",
					} satisfies SubscriptionMessage);
				}
			})
			.finally(() => {
				const live = bySender.get(event.sender.id);
				if (live?.get(request.id) === controller) {
					live.delete(request.id);
				}
			});
	};

	const unsubscribe = (event: SubscriptionEvent, raw: unknown): void => {
		if (registry.owner(event) === undefined) {
			return;
		}
		const decoded = decodeUnsubscribe(raw);
		if (Result.isFailure(decoded)) {
			return;
		}
		const live = bySender.get(event.sender.id);
		const controller = live?.get(decoded.success.id);
		if (controller !== undefined) {
			controller.abort();
		}
	};

	return { subscribe, unsubscribe };
};
