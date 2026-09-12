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
				drafts.onChanged((_ref, snapshot) => changed.push(snapshot.text));
				const first = yield* drafts.write(ref, "first draft");
				const later = yield* drafts.write(ref, "later edit");
				yield* drafts.clear(ref, first.revision);
				expect(yield* drafts.read(ref)).toEqual(later);
				return later;
			}),
		).pipe(Effect.provide(ShellDraftsLayer(directory)));
		yield* ShellDrafts.use((drafts) =>
			Effect.gen(function* () {
				expect(yield* drafts.read(ref)).toEqual(edited);
				drafts.onChanged((_ref, snapshot) => changed.push(snapshot.text));
				yield* drafts.clear(ref, edited.revision);
				expect((yield* drafts.read(ref)).text).toBe("");
			}),
		).pipe(Effect.provide(ShellDraftsLayer(directory)));
		expect(changed).toEqual(["first draft", "later edit", ""]);
	}).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("imports an existing browser draft once without replacing shell edits", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* fs.makeTempDirectoryScoped();
		yield* ShellDrafts.use((drafts) =>
			Effect.gen(function* () {
				const ref = { sessionId: "session-1", slot: "situation:blocker:piece-1" };
				expect((yield* drafts.read(ref, "unsent old text")).text).toBe("unsent old text");
				const next = yield* drafts.write(ref, "new text");
				expect(yield* drafts.read(ref, "unsent old text")).toEqual(next);
				yield* drafts.clear(ref, next.revision);
				expect((yield* drafts.read(ref, "unsent old text")).text).toBe("");
			}),
		).pipe(Effect.provide(ShellDraftsLayer(directory)));
	}).pipe(Effect.provide(NodeServices.layer)),
);
