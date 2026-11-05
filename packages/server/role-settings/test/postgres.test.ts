import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const request = (name: string) => Request.make(name);

postgresApp.it(
	"keeps role-settings readers quiet until commit and discards rollback",
	[],
	function* ({ api, roleSettingsHistory, transaction, rollback, published, clearPublished }) {
		const before = yield* answered(api["roleSettings.defaults"]({}), "roleSettings.defaults");
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
		expect(yield* answered(api["roleSettings.defaults"]({}), "roleSettings.defaults")).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		const committed = yield* answered(api["roleSettings.defaults"]({}), "roleSettings.defaults");
		expect(committed).not.toEqual(before);
		expect(yield* published()).toContain("roleSetting");
		yield* clearPublished();
		yield* rollback(roleSettingsHistory.append(request("rollback"), [event]));
		expect(yield* answered(api["roleSettings.defaults"]({}), "roleSettings.defaults")).toEqual(committed);
		expect(yield* published()).toEqual([]);
	},
);
