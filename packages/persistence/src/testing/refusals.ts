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

// why: a durable write that refuses is a case the product must survive, and no
// mock can prove it — the refusal has to come from the database the code writes
// to. Each trigger names one write so a test can lose exactly that one.
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

// why: a node's journal has to be able to fail on its own without taking the
// root's down with it. Messages are what a delegated agent produces and what
// the root of a delegating turn does not, so refusing them refuses one node's
// words and leaves every other append standing.
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
