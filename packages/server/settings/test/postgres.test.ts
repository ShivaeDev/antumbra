import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const request = (name: string) => Request.make(name);
postgresApp.it(
	"keeps defaults, constraints and refresh keys equal to the journal after fixture replay",
	[],
	function* ({ api, journal, replayJournal, clearPublished, published, rebuild }) {
		const legacy = yield* journal();
		expect(yield* api["settings.flags"]({})).toEqual(yield* answered(legacy.api.settings.flags({}), "flags"));
		expect(yield* api["settings.counts"]({})).toEqual(yield* answered(legacy.api.settings.counts({}), "counts"));
		yield* legacy.api.settings.setFlag({ key: "holdEverything", on: true, requestId: request("hold") });
		yield* legacy.api.settings.setCount({ key: "maxParallelSessions", count: 12, requestId: request("capacity") });
		yield* replayJournal(legacy);
		const before = yield* api["settings.counts"]({});
		expect(before).toEqual(yield* answered(legacy.api.settings.counts({}), "counts"));
		expect(yield* api["settings.flags"]({})).toEqual(yield* answered(legacy.api.settings.flags({}), "flags"));
		yield* clearPublished();
		expect(yield* Effect.flip(api["settings.setCount"]({ key: "maxParallelSessions", count: 65, requestId: request("reject") }))).toMatchObject({
			_tag: "OutOfRange",
		});
		expect(yield* api["settings.counts"]({})).toEqual(before);
		expect(yield* published()).toEqual([]);
		const watched = yield* legacy.watchKeys(["count", "count:fleet", "flag", "flag:fleet"]);
		const input = { key: "maxParallelSessions" as const, count: 64, requestId: request("update") };
		yield* api["settings.setCount"](input);
		yield* legacy.api.settings.setCount(input);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		expect(yield* api["settings.counts"]({})).toEqual(yield* answered(legacy.api.settings.counts({}), "counts"));
		yield* rebuild();
		expect(yield* api["settings.counts"]({})).toEqual(yield* answered(legacy.api.settings.counts({}), "counts"));
	},
);

postgresApp.it(
	"reveals settings and refreshes only after commit and leaves rollback unchanged",
	[],
	function* ({ api, settingsHistory, transaction, rollback, published, clearPublished }) {
		const before = yield* api["settings.counts"]({});
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* settingsHistory.append(request("pending"), [{ _tag: "CountSet", key: "maxParallelSessions", count: 8, at: 0 }]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["settings.counts"]({})).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect((yield* api["settings.counts"]({}))[0]).toMatchObject({ count: 8 });
		expect(yield* published()).toContain("count:fleet");
		yield* clearPublished();
		yield* rollback(settingsHistory.append(request("rollback"), [{ _tag: "CountSet", key: "maxParallelSessions", count: 9, at: 0 }]));
		expect((yield* api["settings.counts"]({}))[0]).toMatchObject({ count: 8 });
		expect(yield* published()).toEqual([]);
	},
);
