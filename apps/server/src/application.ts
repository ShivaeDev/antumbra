import { Owner, Runner } from "@antumbra/platform-access/policy.ts";
import { InputStorage } from "@antumbra/server-inputs/storage.ts";
import { Effect, Layer, Path } from "effect";
import { permissionLayer } from "@shivaedev/identity/server/permissionLayer.ts";
import { artifactContentHandlers } from "#adapters/artifacts/content-layer.ts";
import { artifactSource } from "#adapters/artifacts/source.ts";
import { inputDeliveryLayer } from "#adapters/inputs/delivery.ts";
import { charters } from "#agents/charter.ts";
import { provisioning } from "#agents/provisioning.ts";
import { runnerOperations } from "#agents/runner-operations.ts";
import { toolCatalog } from "#agents/tool-catalog.ts";
import { debugHandlers } from "#debug.ts";
import { Files } from "#files.ts";
import { handlers } from "#handlers.ts";
import { lifecycleHandlers } from "#lifecycle/handlers.ts";
import { layer as connections } from "#runner/connections.ts";
import { layer as runnerHandlers } from "#runner/rpc.ts";
import { runtime } from "#runtime.ts";
import { services as sqlServices } from "#services.ts";
import { execution } from "#sessions/execution/service.ts";
import { runnerTranscriptLog } from "#transcript/read-log.ts";
import { transcriptLayer } from "#transcript/route.ts";

export { definition } from "#definition.ts";

const inputStorage = Layer.unwrap(
	Effect.gen(function* () {
		const files = yield* Files;
		const path = yield* Path.Path;
		return Layer.succeed(InputStorage, { root: path.join(files.root, "session-inputs") });
	}),
);
const services = connections.pipe(Layer.provideMerge(sqlServices.pipe(Layer.provideMerge(inputStorage))));
const ports = Layer.mergeAll(charters, provisioning, runnerOperations, toolCatalog).pipe(Layer.provideMerge(services));
const delivery = Layer.mergeAll(inputDeliveryLayer, execution, artifactSource, runnerTranscriptLog).pipe(Layer.provideMerge(ports));

export const application = Layer.mergeAll(
	handlers,
	permissionLayer(Owner),
	permissionLayer(Runner),
	debugHandlers,
	runtime,
	artifactContentHandlers,
	lifecycleHandlers,
	runnerHandlers,
	transcriptLayer,
).pipe(Layer.provideMerge(delivery));
