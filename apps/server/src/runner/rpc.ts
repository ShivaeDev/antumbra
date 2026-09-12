import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect, Stream } from "effect";
import { append } from "#runner/append.ts";
import { RunnerConnections } from "#runner/connections.ts";
import { invoke } from "#tools/invoke.ts";

export const layer = RunnerRpc.toLayer({
	"runner.operations": (registration) => Stream.unwrap(Effect.map(RunnerConnections, (connections) => connections.operations(registration))),
	"runner.reply": (reply) => Effect.flatMap(RunnerConnections, (connections) => connections.reply(reply)),
	"runner.append": append,
	"runner.cursor": ({ logId }) => Effect.flatMap(Commit, (commit) => commit.cursor(logId)),
	"runner.tool": invoke,
});
