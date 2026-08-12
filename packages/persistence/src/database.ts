import { makeSqliteDatabase } from "@shivaedev/effect-prisma/sqlite";
import type { Contract } from "../contract.js";
import contractJson from "../contract.json" with { type: "json" };

export const Database = makeSqliteDatabase<Contract>(
	"@antumbra/persistence/Database",
	{ contractJson },
);
