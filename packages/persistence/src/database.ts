import type {
	DatabaseRequirement,
	DatabaseServiceOf,
} from "@shivaedev/effect-prisma";
import { makeSqliteDatabase } from "@shivaedev/effect-prisma/sqlite";
import type { Contract } from "#contract.d.ts";
import contractJson from "#contract.json" with { type: "json" };

export const Database = makeSqliteDatabase<Contract>(
	"@antumbra/persistence/Database",
	{ contractJson },
);

// why: effect-prisma is fenced inside this package (depcruise), so consumers
// name the database's service and executor types through these aliases.
export type DatabaseService = DatabaseServiceOf<typeof Database>;
export type WriteExecutors = DatabaseRequirement<typeof Database>;
