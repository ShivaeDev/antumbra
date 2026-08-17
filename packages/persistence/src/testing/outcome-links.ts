import { DatabaseSync } from "node:sqlite";
import type { DatabaseFilePath } from "#data-dir.ts";

export const rejectTestOutcomeLinks = (
	databasePath: DatabaseFilePath,
	outcome: "artifact" | "report",
) => {
	const targets = {
		artifact: {
			message: "reject piece artifact link",
			table: "pieceArtifact",
			trigger: "reject_piece_artifact_link",
		},
		report: {
			message: "reject piece report link",
			table: "pieceReport",
			trigger: "reject_piece_report_link",
		},
	};
	const target = targets[outcome];
	const database = new DatabaseSync(databasePath);
	try {
		database.exec(`
			CREATE TRIGGER ${target.trigger}
			BEFORE INSERT ON "${target.table}"
			BEGIN
				SELECT RAISE(FAIL, '${target.message}');
			END
		`);
	} finally {
		database.close();
	}
};
