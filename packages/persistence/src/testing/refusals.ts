import { DatabaseSync } from "node:sqlite";
import type { DatabaseFilePath } from "#data-dir.ts";

const withDatabase = (databasePath: DatabaseFilePath, statement: string): void => {
	const database = new DatabaseSync(databasePath);
	try {
		database.exec(statement);
	} finally {
		database.close();
	}
};

const refuseInsert = (trigger: string, table: string, when: string): string => `
	CREATE TRIGGER ${trigger}
	BEFORE INSERT ON "${table}"
	WHEN ${when}
	BEGIN
		SELECT RAISE(FAIL, '${trigger}');
	END
`;

export const rejectTestSessionOpenedWrites = (databasePath: DatabaseFilePath) => {
	withDatabase(databasePath, refuseInsert("reject_session_opened", "sessionEvent", "NEW.\"kind\" = 'session.opened'"));
};

export const allowTestSessionOpenedWrites = (databasePath: DatabaseFilePath) => {
	withDatabase(databasePath, "DROP TRIGGER reject_session_opened");
};

export const rejectTestSessionMessageWrites = (databasePath: DatabaseFilePath) => {
	withDatabase(databasePath, refuseInsert("reject_session_message", "sessionEvent", "NEW.\"kind\" = 'message'"));
};

export const rejectTestChangeUpdates = (databasePath: DatabaseFilePath) => {
	withDatabase(
		databasePath,
		`
			CREATE TRIGGER reject_change_update
			BEFORE UPDATE ON "change"
			BEGIN
				SELECT RAISE(FAIL, 'reject change update');
			END
		`,
	);
};

export const allowTestChangeUpdates = (databasePath: DatabaseFilePath) => {
	withDatabase(databasePath, "DROP TRIGGER reject_change_update");
};
