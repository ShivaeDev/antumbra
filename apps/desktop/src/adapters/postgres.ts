import { prepareDatabase } from "@antumbra/server/storage.ts";
import { Context, Effect, Layer, type Redacted } from "effect";

export class Postgres extends Context.Service<Postgres, { readonly url: Redacted.Redacted<string> }>()("@antumbra/desktop/Postgres") {}
export const PostgresLayer = (directory: string) =>
	Layer.effect(
		Postgres,
		Effect.map(prepareDatabase(directory), (url) => ({ url })),
	);
