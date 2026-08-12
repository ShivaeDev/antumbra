import { join } from "node:path";
import { Brand } from "effect";

export type DatabaseFilePath = string & Brand.Brand<"DatabaseFilePath">;

export const brandDatabaseFilePath = Brand.nominal<DatabaseFilePath>();

export const databaseFileInDataDirectory = (
	dataDirectory: string,
): DatabaseFilePath =>
	brandDatabaseFilePath(join(dataDirectory, "antumbra.db"));
