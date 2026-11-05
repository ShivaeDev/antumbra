import { handlers } from "@antumbra/server/handlers.ts";
import { layer as runners } from "@antumbra/server/runner/connections.ts";
import { services } from "@antumbra/server/services.ts";
import { postgresTranscripts } from "@antumbra/server/transcript/postgres.ts";
import { CurrentViewer } from "@shivaedev/contract/readPolicy.ts";
import { Layer, Option } from "effect";
export const postgresApplication = Layer.merge(handlers, postgresTranscripts)
	.pipe(Layer.provide(Layer.succeed(CurrentViewer, Option.some({ id: "admiral" }))))
	.pipe(Layer.provideMerge(services), Layer.provideMerge(runners));
