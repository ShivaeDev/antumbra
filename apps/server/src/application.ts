import { app } from "@antumbra/server-journal/app.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { serving } from "@antumbra/server-journal/rpc.ts";
import { Effect, Layer, Path } from "effect";
import { artifactContentHandlers } from "#adapters/artifacts/content-layer.ts";
import { inputDeliveryLayer } from "#adapters/inputs/delivery.ts";
import { servingInputs } from "#adapters/inputs/handlers.ts";
import { features } from "#features.ts";
import { Files } from "#files.ts";
import { lifecycleHandlers } from "#lifecycle/handlers.ts";
import { projections } from "#projections.ts";
import { layer as connections } from "#runner/connections.ts";
import { layer as runnerHandlers } from "#runner/rpc.ts";
import { runtime } from "#runtime.ts";
import { execution } from "#sessions/execution/service.ts";
import { servingStarts } from "#starts/handlers.ts";
import { resources } from "#starts/resources.ts";
import { transcriptLayer } from "#transcript/route.ts";

export const definition = app(features, projections);

const inputs = Layer.unwrap(
	Effect.gen(function* () {
		const files = yield* Files;
		const path = yield* Path.Path;
		return servingInputs(path.join(files.root, "session-inputs"));
	}),
);
const journal = Journal.layer(definition);
const services = connections.pipe(Layer.provideMerge(journal));
const delivery = Layer.mergeAll(inputDeliveryLayer, execution, resources).pipe(Layer.provideMerge(services));

export const application = Layer.mergeAll(
	runtime,
	servingStarts,
	serving(definition.features),
	artifactContentHandlers,
	inputs,
	lifecycleHandlers,
	runnerHandlers,
	transcriptLayer,
).pipe(Layer.provideMerge(delivery));
