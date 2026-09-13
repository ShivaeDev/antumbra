import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { DebugRpc } from "@antumbra/platform-rpc/debug.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { serving } from "@antumbra/server-journal/rpc.ts";
import { Effect, Layer, Path } from "effect";
import { artifactContentHandlers } from "#adapters/artifacts/content-layer.ts";
import { servingInputs } from "#adapters/inputs/handlers.ts";
import { localInputDelivery } from "#adapters/inputs/local-delivery.ts";
import { debugHandlers } from "#debug.ts";
import { definition } from "#definition.ts";
import { features } from "#features.ts";
import { Files } from "#files.ts";
import { transcriptLayer } from "#transcript/route.ts";

export const fixtureRpc = group(features).merge(
	DebugRpc.middleware(Token),
	artifactContent.middleware(Token),
	InputsRpc.middleware(Token),
	TranscriptRpc.middleware(Token),
);

const inputs = Layer.unwrap(
	Effect.gen(function* () {
		const files = yield* Files;
		const path = yield* Path.Path;
		return servingInputs(path.join(files.root, "session-inputs"));
	}),
);

export const fixtureApplication = Layer.mergeAll(debugHandlers, serving(definition.features), artifactContentHandlers, inputs, transcriptLayer).pipe(
	Layer.provideMerge(localInputDelivery.pipe(Layer.provideMerge(Journal.layer(definition)))),
);
