import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Effect, Stream } from "effect";
import { reportModels } from "#backends/report.ts";
import { append } from "#runner/append.ts";
import { RunnerConnections } from "#runner/connections.ts";
import { invoke } from "#tools/invoke.ts";

export const layer = RunnerRpc.toLayer({
	"runner.operations": (registration) =>
		Stream.unwrap(
			Effect.gen(function* () {
				const backendsService = yield* Backends;

				for (const backend of AGENT_BACKEND_TAGS.filter((backend) => registration.backends.includes(backend))) {
					yield* backendsService
						.observeCapability({ backend, imageInput: registration.imageInputBackends.includes(backend), requestId: Request.make(make()) })
						.pipe(Effect.orDie);
				}
				const connections = yield* RunnerConnections;
				return Stream.merge(connections.operations(registration), Stream.drain(Stream.fromEffect(reportModels(registration))));
			}),
		),
	"runner.reply": (reply) => Effect.flatMap(RunnerConnections, (connections) => connections.reply(reply)),
	"runner.append": (input) => append(input).pipe(Effect.orDie),
	"runner.cursor": ({ logId }) => ExecutionHistory.use((history) => history.cursor(logId)).pipe(Effect.orDie),
	"runner.tool": invoke,
});
