import type {
	DatabaseRequirement,
	PrismaError,
} from "@shivaedev/effect-prisma";
import { Context, Effect, Layer, Semaphore } from "effect";
import { Database } from "#database.ts";

type Executors = DatabaseRequirement<typeof Database>;

export class Writer extends Context.Service<
	Writer,
	{
		readonly write: <A, E, R>(
			program: Effect.Effect<A, E, R>,
		) => Effect.Effect<A, E | PrismaError, R | Executors>;
	}
>()("@antumbra/persistence/Writer") {}

// why: SQLite allows one writer at a time; a second concurrent write
// transaction busy-waits the event loop synchronously until the driver's
// busy_timeout expires. A single permit serializes every write transaction
// before it can contend. The executor requirement stays in the caller's
// context so a test-transaction executor (always-rollback harness) is
// honored instead of being overridden with the connect-time one.
export const WriterLive = Layer.effect(Writer)(
	Effect.gen(function* () {
		const db = yield* Database;
		const writePermit = yield* Semaphore.make(1);
		return {
			write: (program) => writePermit.withPermits(1)(db.transaction(program)),
		};
	}),
);
