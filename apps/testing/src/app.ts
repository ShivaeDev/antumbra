import { Credential } from "@antumbra/platform-access/credential.ts";
import { application } from "@antumbra/server/application.ts";
import { CurrentViewer } from "@shivaedev/contract/readPolicy.ts";
import { Layer, Option } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { layer as artifacts } from "#artifacts.ts";
import { layer as files } from "#files.ts";
import { layer as host } from "#host.ts";
import { sessions } from "#identity.ts";

export { definition } from "@antumbra/server/application.ts";

export const ports = Layer.mergeAll(artifacts, files, host);
export const layer = Layer.mergeAll(Layer.provideMerge(application, ports), AtomRegistry.layer).pipe(
	Layer.provideMerge(sessions),
	Layer.provideMerge(Layer.succeed(CurrentViewer, Option.some({ id: "admiral" }))),
	Layer.provideMerge(Layer.succeed(Credential, { token: "test-token" })),
);
