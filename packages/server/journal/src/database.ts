import { Context } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";

export interface Clients {
	readonly read: SqlClient;
	readonly write: SqlClient;
}

export class Database extends Context.Service<Database, Clients>()("@antumbra/journal-server/Database") {}

export class DataDirectory extends Context.Service<DataDirectory, { readonly path: string }>()("@antumbra/journal-server/DataDirectory") {}
