import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const request = (name: string) => Request.make(name);
postgresApp.it(
	"resolves chosen roles against backend and fleet defaults after seeding and rebuilding",
	[],
	function* ({ api, journal, replayJournal, rebuild, published, clearPublished }) {
		const legacy = yield* journal();
		const chosen = { scope: "fleet", role: "crew" as const, backend: "codex" as const, model: null, effort: null, requestId: request("fleet") };
		yield* legacy.api.roleSettings.choose(chosen);
		yield* legacy.api.backends.listModels({
			backend: "codex",
			failure: null,
			models: [{ model: "chart", name: "Chart", isDefault: true, defaultEffort: "high", efforts: ["high"] }],
			requestId: request("models"),
		});
		yield* replayJournal(legacy);
		expect(yield* api["roleSettings.defaults"]({})).toEqual(yield* answered(legacy.api.roleSettings.defaults({}), "defaults"));
		const watched = yield* legacy.watchKeys(["roleSetting", "roleSetting:reef"]);
		yield* clearPublished();
		const voyage = { ...chosen, scope: "reef", model: "custom", effort: "low", requestId: request("voyage") };
		yield* api["roleSettings.choose"](voyage);
		yield* legacy.api.roleSettings.choose(voyage);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		const resolved = yield* api["roleSettings.resolve"]({ voyageId: "reef", role: "crew" });
		expect(resolved).toEqual(yield* answered(legacy.api.roleSettings.resolve({ voyageId: "reef", role: "crew" }), "resolution"));
		yield* rebuild();
		expect(yield* api["roleSettings.resolve"]({ voyageId: "reef", role: "crew" })).toEqual(resolved);
		yield* clearPublished();
		expect(yield* Effect.flip(api["roleSettings.choose"]({ ...voyage, model: "other" }))).toMatchObject({ _tag: "AlreadyDone" });
		expect(yield* api["roleSettings.resolve"]({ voyageId: "reef", role: "crew" })).toEqual(resolved);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"keeps role-settings readers quiet until commit and discards rollback",
	[],
	function* ({ api, roleSettingsHistory, transaction, rollback, published, clearPublished }) {
		const before = yield* api["roleSettings.defaults"]({});
		const event = {
			_tag: "RoleSettingChosen" as const,
			scope: "fleet",
			role: "crew" as const,
			backend: "codex",
			model: "chart",
			effort: "high",
			at: 0,
		};
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* roleSettingsHistory.append(request("pending"), [event]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["roleSettings.defaults"]({})).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		const committed = yield* api["roleSettings.defaults"]({});
		expect(committed).not.toEqual(before);
		expect(yield* published()).toContain("roleSetting");
		yield* clearPublished();
		yield* rollback(roleSettingsHistory.append(request("rollback"), [event]));
		expect(yield* api["roleSettings.defaults"]({})).toEqual(committed);
		expect(yield* published()).toEqual([]);
	},
);
