import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { DebugRpc } from "@antumbra/platform-rpc/debug.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { layerServer, Token } from "@antumbra/platform-rpc/token.ts";
import { InputStorage } from "@antumbra/server-inputs/storage.ts";
import { Effect, Layer, Path } from "effect";
import { artifactContentHandlers } from "#adapters/artifacts/content-layer.ts";
import { localInputDelivery } from "#adapters/inputs/local-delivery.ts";
import { debugHandlers } from "#debug.ts";
import { features } from "#features.ts";
import { Files } from "#files.ts";
import { handlers } from "#handlers.ts";
import { services } from "#services.ts";
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
		return Layer.succeed(InputStorage, { root: path.join(files.root, "session-inputs") });
	}),
);

export const fixtureApplication = Layer.mergeAll(layerServer, debugHandlers, handlers, artifactContentHandlers, transcriptLayer).pipe(
	Layer.provideMerge(localInputDelivery.pipe(Layer.provideMerge(services.pipe(Layer.provideMerge(inputs))))),
);
