import { watching } from "@antumbra/platform-rpc/query.ts";
import { Schema, Stream } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fields = { board: Schema.String };

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

const watched = (live: () => Stream.Stream<unknown, unknown>) => {
	const registry = AtomRegistry.make();
	const seen: AsyncResult.AsyncResult<unknown, unknown>[] = [];
	registry.subscribe(watching(fields, live).atom({ board: "starboard" }), (value) => seen.push(value), { immediate: true });
	return seen;
};

it("reads the query again after the connection drops, until the server answers", () => {
	let subscriptions = 0;
	const seen = watched(() =>
		Stream.suspend(() => {
			subscriptions += 1;
			return subscriptions === 1 ? Stream.fail(new Error("the server went away")) : Stream.make("aboard");
		}),
	);

	expect(seen.some(AsyncResult.isFailure)).toBe(true);
	vi.advanceTimersByTime(1000);

	expect(subscriptions).toBe(2);
	expect(seen.at(-1)).toMatchObject({ _tag: "Success", value: "aboard" });
});

it("leaves a query that answers alone", () => {
	let subscriptions = 0;
	const seen = watched(() =>
		Stream.suspend(() => {
			subscriptions += 1;
			return Stream.make("aboard");
		}),
	);

	vi.advanceTimersByTime(5000);

	expect(subscriptions).toBe(1);
	expect(seen.at(-1)).toMatchObject({ _tag: "Success", value: "aboard" });
});
