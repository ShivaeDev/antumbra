import { backends } from "@antumbra/backends/feature.ts";
import type { BackendCatalog } from "@antumbra/domain/backend-catalog/service";
import { testing } from "@antumbra/journal/testing/entry.ts";
import { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Stream } from "effect";
import { expect } from "vitest";
import { reportModelsOver } from "#adapters/backend-catalog.ts";

const it = testing([backends]);

type Catalog = Effect.Success<typeof BackendCatalog>;

const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);

const opus = { efforts: ["high", "low"], id: "opus", isDefault: true, name: "Opus" };

const catalogOf = (registered: ReadonlyArray<string>, asked: Array<string>): Catalog => ({
	listModels: (tag: string) =>
		Effect.suspend(() => {
			asked.push(tag);
			return tag === "claude" ? Effect.succeed([opus]) : Effect.fail(new BackendFailure({ detail: "answered nothing", tag }));
		}),
	snapshot: () => Effect.succeed({ backends: registered, imageInputBackends: new Set<string>() }),
});

it.app("reports what each registered backend listed", function* (harness) {
	yield* reportModelsOver(harness.api, catalogOf(["claude", "codex"], []));

	expect(yield* answered(harness.api.backends.models({ backend: "claude" }))).toEqual([
		{ backend: "claude", efforts: ["high", "low"], id: "claude/opus", isDefault: true, model: "opus", name: "Opus" },
	]);
	expect(yield* answered(harness.api.backends.catalog({ backend: "claude" }))).toEqual({ backend: "claude", failure: null });
});

it.app("reports a backend whose listing failed, with the failure and no models", function* (harness) {
	yield* reportModelsOver(harness.api, catalogOf(["codex"], []));

	expect(yield* answered(harness.api.backends.catalog({ backend: "codex" }))).toEqual({ backend: "codex", failure: "codex: answered nothing" });
	expect(yield* answered(harness.api.backends.models({ backend: "codex" }))).toEqual([]);
});

it.app("never lists a registered backend the domain has no tag for", function* (harness) {
	const asked: Array<string> = [];
	yield* reportModelsOver(harness.api, catalogOf(["claude", "pi"], asked));

	expect(asked.toSorted()).toEqual(["claude"]);
});
