import process from "node:process";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Cause, Clock, Console, Effect, type FileSystem, Result } from "effect";
import { conditionalGet, currentRepo } from "#pr/adapters/gh.ts";
import { load, save, statePath } from "#pr/adapters/state.ts";
import { type Command, needsHere, parseCommand, resolved } from "#pr/command.ts";
import { type Fleet, fleetFrom, memoryOf } from "#pr/fleet.ts";
import { render } from "#pr/lines.ts";
import { encodeMemory } from "#pr/memory.ts";
import { round } from "#pr/round.ts";

const interval = "30 seconds";

const loop = (path: string, fleet: Fleet, saved: string): Effect.Effect<void, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const next = yield* round(conditionalGet, fleet, yield* Clock.currentTimeMillis);
		yield* Effect.forEach(next.events, (event) => Console.log(render(event)));
		const encoded = encodeMemory(memoryOf(next.fleet));
		if (encoded !== saved) yield* save(path, encoded);
		if (next.exit !== undefined) {
			process.exitCode = next.exit;
			return;
		}
		yield* Effect.sleep(interval);
		yield* loop(path, next.fleet, encoded);
	});

const watch = (command: Command) =>
	Effect.gen(function* () {
		const here = needsHere(command.sources) ? yield* currentRepo : "";
		if (here !== "") yield* Console.error(`bare pull request numbers resolve against ${here}, the GitHub repository of the current directory`);
		const { repos, targets } = resolved(command.sources, here);
		const path = command.state ?? statePath(targets, repos, command.until);
		const memory = yield* load(path);
		yield* loop(path, fleetFrom(targets, repos, command.until, memory), encodeMemory(memory));
	});

const program = Effect.gen(function* () {
	const command = parseCommand(process.argv.slice(2));
	if (Result.isFailure(command)) {
		yield* Console.error(command.failure);
		process.exitCode = 2;
		return;
	}
	yield* watch(command.success);
}).pipe(
	Effect.catchCause((cause) =>
		Console.error(Cause.pretty(cause)).pipe(
			Effect.tap(() =>
				Effect.sync(() => {
					process.exitCode = 2;
				}),
			),
		),
	),
	Effect.provide(NodeServices.layer),
);

NodeRuntime.runMain(program, { disableErrorReporting: true });
