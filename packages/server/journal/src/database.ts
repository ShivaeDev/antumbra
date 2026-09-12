import { Context, type Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";

export interface Clients {
	readonly backup: Effect.Effect<void>;
	readonly read: SqlClient;
	readonly write: SqlClient;
}

export class Database extends Context.Service<Database, Clients>()("@antumbra/server-journal/Database") {}

export class DataDirectory extends Context.Service<DataDirectory, { readonly path: string }>()("@antumbra/server-journal/DataDirectory") {}
