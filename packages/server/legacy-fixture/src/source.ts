import { Context, type Effect, type Scope } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import type { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";

export class LegacySource extends Context.Service<
	LegacySource,
	{
		readonly open: (filename: string) => Effect.Effect<SqlClient, SqlError, Scope.Scope | Reactivity>;
	}
>()("@antumbra/legacy-fixture/LegacySource") {}
