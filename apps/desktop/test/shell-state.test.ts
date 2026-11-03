import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem } from "effect";
import { ShellDrafts, ShellDraftsLayer } from "#adapters/drafts.ts";
import { ShellState, ShellStateLayer } from "#adapters/shell-state.ts";

it.effect("keeps the chosen endpoint and runner log identity across shell restarts", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* fs.makeTempDirectoryScoped();
		const first = yield* ShellState.use((state) => state.rememberPort(49123).pipe(Effect.as(state.identity))).pipe(
			Effect.provide(ShellStateLayer(directory)),
		);
		const reopened = yield* ShellState.use((state) => Effect.succeed(state.identity)).pipe(Effect.provide(ShellStateLayer(directory)));
		expect(reopened).toEqual({ ...first, port: 49123 });
		expect(first.runnerId).not.toBe(first.logId);
	}).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("retains later draft edits when an earlier send finishes and publishes the accepted clear", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* fs.makeTempDirectoryScoped();
		const ref = { sessionId: "session-1", slot: "message" };
		const changed: string[] = [];
		const edited = yield* ShellDrafts.use((drafts) =>
			Effect.gen(function* () {
				drafts.onChanged((_ref, value) => changed.push(value ?? ""));
				yield* drafts.write(ref, "first draft");
				yield* drafts.write(ref, "later edit");
				yield* drafts.clear(ref, "first draft");
				yield* drafts.write(ref, "stale normalized draft", "first draft");
				expect(yield* drafts.read(ref)).toBe("later edit");
				return "later edit";
			}),
		).pipe(Effect.provide(ShellDraftsLayer(directory)));
		yield* ShellDrafts.use((drafts) =>
			Effect.gen(function* () {
				expect(yield* drafts.read(ref)).toEqual(edited);
				drafts.onChanged((_ref, value) => changed.push(value ?? ""));
				yield* drafts.clear(ref, edited);
				expect(yield* drafts.read(ref)).toBeNull();
			}),
		).pipe(Effect.provide(ShellDraftsLayer(directory)));
		expect(changed).toEqual(["first draft", "later edit", ""]);
	}).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("keeps existing text drafts when adopting form storage", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* fs.makeTempDirectoryScoped();
		yield* fs.writeFileString(
			`${directory}/drafts.json`,
			JSON.stringify({
				"session-1/message": { text: "Existing unsent words", revision: "old-revision" },
				"session-2/message": { text: "", revision: "cleared-revision" },
			}),
		);
		yield* ShellDrafts.use((drafts) =>
			Effect.gen(function* () {
				const raw = yield* drafts.read({ sessionId: "session-1", slot: "message" });
				const restored: unknown = JSON.parse(raw ?? "null");
				expect(restored).toMatchObject({ baseline: { text: "" }, values: { text: "Existing unsent words" } });
				expect(yield* drafts.read({ sessionId: "session-2", slot: "message" })).toBeNull();
				yield* drafts.write({ sessionId: "session-3", slot: "message" }, "new draft");
			}),
		).pipe(Effect.provide(ShellDraftsLayer(directory)));
		const reopened = yield* ShellDrafts.use((drafts) => drafts.read({ sessionId: "session-1", slot: "message" })).pipe(
			Effect.provide(ShellDraftsLayer(directory)),
		);
		const restored: unknown = JSON.parse(reopened ?? "null");
		expect(restored).toMatchObject({ values: { text: "Existing unsent words" } });
	}).pipe(Effect.provide(NodeServices.layer)),
);
