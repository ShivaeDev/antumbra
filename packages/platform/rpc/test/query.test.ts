import { watching } from "@antumbra/platform-rpc/query.ts";
import { Schema, Stream } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { RpcClientDefect, RpcClientError } from "effect/unstable/rpc/RpcClientError";
import { SocketCloseError } from "effect/unstable/socket/Socket";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fields = { board: Schema.String };

const dropped = new RpcClientError({ reason: new SocketCloseError({ code: 1000 }) });

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

const failingOnce = (failure: unknown) => {
	let subscriptions = 0;
	const seen = watched(() =>
		Stream.suspend(() => {
			subscriptions += 1;
			return subscriptions === 1 ? Stream.fail(failure) : Stream.make("aboard");
		}),
	);
	return { seen, subscriptions: () => subscriptions };
};

it("reads the query again after the connection drops, until the server answers", () => {
	const { seen, subscriptions } = failingOnce(dropped);

	expect(seen.some(AsyncResult.isFailure)).toBe(true);
	vi.advanceTimersByTime(1000);

	expect(subscriptions()).toBe(2);
	expect(seen.at(-1)).toMatchObject({ _tag: "Success", value: "aboard" });
});

it("leaves a query that failed for its own reason alone", () => {
	const { seen, subscriptions } = failingOnce(new Error("the voyage is not there"));

	vi.advanceTimersByTime(5000);

	expect(subscriptions()).toBe(1);
	expect(seen.at(-1)).toSatisfy(AsyncResult.isFailure);
});

it("leaves a query the client could not decode alone", () => {
	const { seen, subscriptions } = failingOnce(
		new RpcClientError({ reason: new RpcClientDefect({ cause: null, message: "the answer did not decode" }) }),
	);

	vi.advanceTimersByTime(5000);

	expect(subscriptions()).toBe(1);
	expect(seen.at(-1)).toSatisfy(AsyncResult.isFailure);
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

it("keeps the last answer on hand while the connection comes back", () => {
	let subscriptions = 0;
	const seen = watched(() =>
		Stream.suspend(() => {
			subscriptions += 1;
			if (subscriptions === 1) return Stream.concat(Stream.make("aboard"), Stream.fail(dropped));
			return subscriptions === 2 ? Stream.fail(dropped) : Stream.make("back aboard");
		}),
	);
	const aboard = { _tag: "Failure", previousSuccess: { _tag: "Some", value: { value: "aboard" } } };

	expect(seen.at(-1)).toMatchObject(aboard);

	vi.advanceTimersByTime(1000);

	expect(seen.at(-1)).toMatchObject(aboard);

	vi.advanceTimersByTime(1000);

	expect(seen.at(-1)).toMatchObject({ _tag: "Success", value: "back aboard" });
});
