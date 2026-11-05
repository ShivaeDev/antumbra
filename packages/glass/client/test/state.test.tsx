import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { query } from "@antumbra/platform-feature/query.ts";
import { watching } from "@antumbra/platform-rpc/query.ts";
import { expect } from "@effect/vitest";
import { Data, Deferred, Effect, Schema, Stream } from "effect";
import type { ReactNode } from "react";
import { reading } from "#live.tsx";
import { useChoices, WiringContext, wiringOf } from "#wiring.ts";

class ReadFailed extends Data.TaggedError("ReadFailed") {}

const shared = query("shared", {
	input: { ids: Schema.Array(Schema.String) },
	output: Schema.String,
	reads: [],
});

const Reader = () => {
	const state = useChoices(shared, { ids: ["one", "two"] });
	return (
		<section>
			{reading(state, "Reading…", (value) => (
				<output>{String(value)}</output>
			))}
			<button onClick={state.refresh} type="button">
				Refresh
			</button>
		</section>
	);
};

it.glass("shares one reading until its last reader unmounts", function* ({ render }) {
	const released = yield* Deferred.make<void>();
	let subscriptions = 0;
	let active = 0;
	const watched = watching(shared.input, () =>
		Stream.unwrap(
			Effect.acquireRelease(
				Effect.sync(() => {
					subscriptions += 1;
					active += 1;
					return Stream.concat(Stream.make("aboard"), Stream.never);
				}),
				() =>
					Effect.sync(() => {
						active -= 1;
					}).pipe(Effect.andThen(Deferred.succeed(released, undefined))),
			),
		),
	);
	const wiring = wiringOf(new Map([[shared, watched]]));
	const readers = (children: ReactNode) => <WiringContext value={wiring}>{children}</WiringContext>;
	const container = yield* render(
		readers(
			<>
				<Reader />
				<Reader />
			</>,
		),
	);
	yield* until(() => container.querySelectorAll("output").length === 2, "both readers to show the answer");
	expect(container.textContent).toContain("aboard");
	expect(subscriptions).toBe(1);
	expect(active).toBe(1);

	yield* render(readers(<Reader />));
	expect(container.querySelector("output")?.textContent).toBe("aboard");
	expect(active).toBe(1);
	yield* render(null);
	yield* Deferred.await(released).pipe(Effect.timeout("2 seconds"));
	expect(active).toBe(0);
});

it.glass("keeps useful data after repeated failed refreshes", function* ({ render }) {
	let failed = false;
	const watched = watching(shared.input, () => Stream.suspend(() => (failed ? Stream.fail(new ReadFailed()) : Stream.make("aboard"))));
	const wiring = wiringOf(new Map([[shared, watched]]));
	const container = yield* render(
		<WiringContext value={wiring}>
			<Reader />
		</WiringContext>,
	);
	yield* until(() => container.querySelector("output")?.textContent === "aboard", "the reading to arrive");
	failed = true;
	yield* press(container, "Refresh");
	yield* until(() => container.querySelector('[role="alert"]') !== null, "the failed refresh to appear");
	expect(container.querySelector("output")?.textContent).toBe("aboard");
	yield* press(container, "Refresh");
	yield* until(() => container.querySelector('[role="alert"]') !== null, "the second failed refresh to appear");
	expect(container.querySelector("output")?.textContent).toBe("aboard");
	failed = false;
	yield* press(container, "Refresh");
	yield* until(() => container.querySelector('[role="alert"]') === null, "the refreshed reading to recover");
	expect(container.querySelector("output")?.textContent).toBe("aboard");
});
