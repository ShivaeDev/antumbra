import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const model = { model: "chart", name: "Chart", isDefault: true, defaultEffort: "high", efforts: ["high"] };
const listing = { backend: "codex" as const, failure: null, models: [model] };
const request = (name: string) => Request.make(name);

postgresApp.it(
	"keeps repeated listing receipts at their original version without waking readers",
	[],
	function* ({ api, backendsHistory, clearPublished, published, clock }) {
		const first = yield* api["backends.listModels"]({ ...listing, requestId: request("first") });
		yield* clearPublished();
		yield* clock.advance(1_000);
		const repeated = yield* api["backends.listModels"]({ ...listing, requestId: request("repeat") });
		expect(repeated).toBe(first);
		expect(yield* backendsHistory.read()).toHaveLength(1);
		expect(yield* published()).toEqual([]);
		const newer = { ...listing, models: [{ ...model, name: "New chart" }] };
		yield* api["backends.listModels"]({ ...newer, requestId: request("newer") });
		yield* clearPublished();
		expect(yield* api["backends.listModels"]({ ...listing, requestId: request("repeat") })).toBe(repeated);
		expect(yield* api["backends.models"]({ backend: "codex" })).toMatchObject([{ name: "New chart" }]);
		expect(yield* api["backends.catalog"]({ backend: "codex" })).toMatchObject({ failure: null });
		expect(yield* backendsHistory.read()).toHaveLength(2);
		expect(yield* published()).toEqual([]);
		yield* backendsHistory.rebuild();
		expect(yield* api["backends.models"]({ backend: "codex" })).toMatchObject([{ name: "New chart" }]);
		yield* clearPublished();
		expect(yield* api["backends.listModels"]({ ...listing, requestId: request("repeat") })).toBe(repeated);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"keeps repeated capability receipts without changing the later observation",
	[],
	function* ({ api, backendsHistory, clearPublished, published }) {
		const input = { backend: "codex" as const, imageInput: true, requestId: request("capability") };
		const first = yield* api["backends.observeCapability"](input);
		yield* clearPublished();
		const repeated = yield* api["backends.observeCapability"]({ ...input, requestId: request("capability-repeat") });
		expect(repeated).toBe(first);
		expect(yield* published()).toEqual([]);
		yield* api["backends.observeCapability"]({ ...input, imageInput: false, requestId: request("capability-newer") });
		yield* clearPublished();
		expect(yield* api["backends.observeCapability"]({ ...input, requestId: request("capability-repeat") })).toBe(repeated);
		expect(yield* api["backends.catalog"]({ backend: "codex" })).toEqual({ backend: "codex", imageInput: false, failure: null });
		expect(yield* backendsHistory.read()).toHaveLength(2);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"replays backend fixtures and accepts a later listing with the journal refresh keys",
	[],
	function* ({ api, journal, replayJournal, clearPublished, published }) {
		const legacy = yield* journal();
		yield* legacy.api.backends.listModels({ ...listing, requestId: request("seed") });
		yield* replayJournal(legacy);
		expect(yield* api["backends.models"]({ backend: "codex" })).toEqual(yield* answered(legacy.api.backends.models({ backend: "codex" }), "models"));
		const watched = yield* legacy.watchKeys(["backendModel", "backendModel:codex", "backendCatalog", "backendCatalog:codex"]);
		yield* clearPublished();
		const input = { ...listing, failure: "unavailable", models: [], requestId: request("failure") };
		yield* legacy.api.backends.listModels(input);
		yield* api["backends.listModels"](input);
		expect(yield* api["backends.catalog"]({ backend: "codex" })).toEqual(
			yield* answered(legacy.api.backends.catalog({ backend: "codex" }), "catalog"),
		);
		expect(yield* api["backends.models"]({ backend: "codex" })).toEqual([]);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
	},
);

postgresApp.it(
	"keeps backends readers quiet until commit and discards rollback",
	[],
	function* ({ api, backendsHistory, transaction, rollback, published, clearPublished }) {
		const before = yield* api["backends.models"]({ backend: "codex" });
		const event = { _tag: "ModelsListed" as const, ...listing, at: 0 };
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* backendsHistory.append(request("pending"), [event]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["backends.models"]({ backend: "codex" })).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		const committed = yield* api["backends.models"]({ backend: "codex" });
		expect(committed).not.toEqual(before);
		expect(yield* published()).toContain("backendModel");
		yield* clearPublished();
		yield* rollback(backendsHistory.append(request("rollback"), [event]));
		expect(yield* api["backends.models"]({ backend: "codex" })).toEqual(committed);
		expect(yield* published()).toEqual([]);
	},
);
