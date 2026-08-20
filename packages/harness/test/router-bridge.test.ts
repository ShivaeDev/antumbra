import type { AntumbraBridge, SubscriptionMessage } from "@antumbra/contract";
import { makeAppRouter } from "@antumbra/contract";
import {
	info,
	makeRuntime,
	makeScriptedFeeds,
	staticFeeds,
} from "@antumbra/contract/fixtures";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeBrowserBridge } from "#adapters/router-bridge.ts";

const bridgeOver = (runtime: ReturnType<typeof makeRuntime>): AntumbraBridge =>
	makeBrowserBridge(makeAppRouter(runtime));

const collectFeed = (bridge: AntumbraBridge, path: string, input?: unknown) =>
	Effect.callback<ReadonlyArray<SubscriptionMessage>>((resume) => {
		const seen: SubscriptionMessage[] = [];
		const stop = bridge.subscribe({ id: "feed-1", input, path }, (message) => {
			seen.push(message);
			if (message.type !== "data") {
				resume(Effect.succeed(seen));
			}
		});
		return Effect.sync(stop);
	});

const dataOf = (messages: ReadonlyArray<SubscriptionMessage>) =>
	messages.flatMap((message) =>
		message.type === "data" ? [message.data] : [],
	);

describe("makeBrowserBridge", () => {
	it.effect("answers a query with what the fixture sources hold", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime(staticFeeds);
			const bridge = bridgeOver(runtime);
			const answered = yield* Effect.promise(() =>
				bridge.trpc({ input: undefined, path: "appInfo", type: "query" }),
			);
			expect(answered).toEqual({ data: info, ok: true });
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("reports a refused mutation as a failed response", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime(staticFeeds);
			const bridge = bridgeOver(runtime);
			const answered = yield* Effect.promise(() =>
				bridge.trpc({
					input: { sessionId: "ghost" },
					path: "interruptSession",
					type: "mutation",
				}),
			);
			expect(answered.ok).toBe(false);
			expect(JSON.stringify(answered)).toContain("session not live: ghost");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("pumps a single-emission feed to completion", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime(staticFeeds);
			const bridge = bridgeOver(runtime);
			const messages = yield* collectFeed(bridge, "fleetFeed");
			expect(dataOf(messages)).toHaveLength(1);
			expect(messages.at(-1)).toEqual({ type: "done" });
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("delivers every scripted update before the feed closes", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime(makeScriptedFeeds("5 millis"));
			const bridge = bridgeOver(runtime);
			const messages = yield* collectFeed(bridge, "fleetFeed");
			const fleets = dataOf(messages);
			expect(fleets).toHaveLength(3);
			expect(messages.at(-1)).toEqual({ type: "done" });
			expect(JSON.stringify(fleets.at(-1))).toContain("agent-2");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("closes a refused feed on the error channel", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime(staticFeeds);
			const bridge = bridgeOver(runtime);
			const messages = yield* collectFeed(bridge, "voyageFeed", {
				voyageId: "ghost",
			});
			expect(dataOf(messages)).toEqual([]);
			expect(messages.at(-1)?.type).toBe("error");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);
});
