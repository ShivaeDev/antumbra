import { applicationStory } from "@antumbra/app-testing/application-story.ts";
import { NodeServices } from "@effect/platform-node";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Clock, Effect, FileSystem, Path } from "effect";
import { ShellState, ShellStateLayer } from "#adapters/shell-state.ts";
import { selectDevTracing } from "#adapters/tracing.ts";

export const secret = "Bearer local-trace-credential";
const create = Effect.fn("ShellTraceStory.create")(function* () {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const clock = yield* Clock.Clock;
	const directory = yield* fs.makeTempDirectoryScoped();
	const recordShell = (isPackaged: boolean) =>
		Effect.gen(function* () {
			const traceId = yield* Effect.scoped(
				Effect.gen(function* () {
					const span = yield* Effect.currentSpan;
					yield* ShellState.use((state) => state.rememberPort(49123));
					return span.traceId;
				}).pipe(
					Effect.withSpan("Shell.rememberEndpoint", { attributes: { authorization: secret, agentId: "trace-agent" } }),
					Effect.provide(ShellStateLayer(directory)),
					Effect.provide(selectDevTracing({ dataDirectory: directory, isPackaged, clock })),
				),
			);
			const file = path.join(directory, "traces.db");
			const stored = (yield* fs.exists(file)) ? new TextDecoder().decode(yield* fs.readFile(file)) : undefined;
			return { stored, traceId };
		});
	return { recordShell };
});
const shellTracing = storyKit({ name: "Shell tracing", clock: "test", layer: NodeServices.layer, stages: [], create, verbs: (engine) => engine });
export const tracing = storyKit({ name: "Antumbra local traces", extends: [applicationStory, shellTracing] });
