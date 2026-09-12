import { observeCapability } from "@antumbra/domain-backends/commands/observe-capability.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect, Stream } from "effect";
import { reportModels } from "#backends/report.ts";
import { append } from "#runner/append.ts";
import { RunnerConnections } from "#runner/connections.ts";
import { invoke } from "#tools/invoke.ts";

export const layer = RunnerRpc.toLayer({
	"runner.operations": (registration) =>
		Stream.unwrap(
			Effect.gen(function* () {
				const commit = yield* Commit;
				for (const backend of AGENT_BACKEND_TAGS.filter((backend) => registration.backends.includes(backend))) {
					yield* commit
						.commit(observeCapability, { backend, imageInput: registration.imageInputBackends.includes(backend), requestId: Request.make(make()) })
						.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
				}
				const connections = yield* RunnerConnections;
				return Stream.merge(connections.operations(registration), Stream.drain(Stream.fromEffect(reportModels(registration))));
			}),
		),
	"runner.reply": (reply) => Effect.flatMap(RunnerConnections, (connections) => connections.reply(reply)),
	"runner.append": append,
	"runner.cursor": ({ logId }) => Effect.flatMap(Commit, (commit) => commit.cursor(logId)),
	"runner.tool": invoke,
});
