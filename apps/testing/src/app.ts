import { ClientToken, layerClient, ServerToken } from "@antumbra/platform-rpc/token.ts";
import { application } from "@antumbra/server/application.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { Layer } from "effect";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

export { definition } from "@antumbra/server/application.ts";

const tokens = Layer.merge(Layer.succeed(ClientToken, { token: "test-token" }), Layer.succeed(ServerToken, { token: "test-token" }));

export const layer = Layer.mergeAll(Layer.provideMerge(application, Journal.memory()), layerClient, AtomRegistry.layer).pipe(
	Layer.provideMerge(tokens),
);
