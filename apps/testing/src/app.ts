import { ClientToken, layerClient, ServerToken } from "@antumbra/platform-rpc/token.ts";
import { application } from "@antumbra/server/application.ts";
import { Layer } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { layer as artifacts } from "#artifacts.ts";
import { layer as files } from "#files.ts";
import { layer as host } from "#host.ts";

export { definition } from "@antumbra/server/application.ts";

const tokens = Layer.merge(Layer.succeed(ClientToken, { token: "test-token" }), Layer.succeed(ServerToken, { token: "test-token" }));

export const layer = Layer.mergeAll(Layer.provideMerge(application, Layer.mergeAll(artifacts, files, host)), layerClient, AtomRegistry.layer).pipe(
	Layer.provideMerge(tokens),
);
