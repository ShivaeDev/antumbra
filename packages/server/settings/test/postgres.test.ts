import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const request = (name: string) => Request.make(name);

postgresApp.it(
	"reveals settings and refreshes only after commit and leaves rollback unchanged",
	[],
	function* ({ api, settingsHistory, transaction, rollback, published, clearPublished }) {
		const before = yield* answered(api["settings.counts"]({}), "settings.counts");
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
		expect(yield* answered(api["settings.counts"]({}), "settings.counts")).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect((yield* answered(api["settings.counts"]({}), "settings.counts"))[0]).toMatchObject({ count: 8 });
		expect(yield* published()).toContain(invalidationKeys([{ _tag: "Bucket", collection: "count", field: "scope", value: "fleet" }])[0]);
		yield* clearPublished();
		yield* rollback(settingsHistory.append(request("rollback"), [{ _tag: "CountSet", key: "maxParallelSessions", count: 9, at: 0 }]));
		expect((yield* answered(api["settings.counts"]({}), "settings.counts"))[0]).toMatchObject({ count: 8 });
		expect(yield* published()).toEqual([]);
	},
);
