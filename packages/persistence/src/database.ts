import type { DatabaseServiceOf } from "@shivaedev/effect-prisma";
import { makeSqliteDatabase } from "@shivaedev/effect-prisma/sqlite";
import { Effect } from "effect";
import type { Contract } from "../contract.js";
import contractJson from "../contract.json" with { type: "json" };

export const Database = makeSqliteDatabase<Contract>(
	"@antumbra/persistence/Database",
	{ contractJson },
);

// why: effect-prisma's model lookup widens to `| undefined` under
// noUncheckedIndexedAccess, which the library's own repo does not enable.
// A missing model is a contract-generation defect, so it dies as one here
// instead of forcing every consumer to guard.
export const appMeta = (db: DatabaseServiceOf<typeof Database>) =>
	db.AppMeta === undefined
		? Effect.die(new Error("AppMeta model missing from the contract"))
		: Effect.succeed(db.AppMeta);
