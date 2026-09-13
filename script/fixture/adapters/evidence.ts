import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Schema } from "effect";
import { fixtureIO } from "#fixture/manifest.ts";

export const snapshotDatabase = (source: string, destination: string) =>
	fixtureIO(async () => {
		const database = new DatabaseSync(source, { readOnly: true });
		try {
			database.prepare("VACUUM INTO ?").run(destination);
		} finally {
			database.close();
		}
	});

const Identity = Schema.Struct({ logId: Schema.String });
const Cursor = Schema.Struct({ logId: Schema.String, cursor: Schema.Int });
const Fact = Schema.Struct({ name: Schema.String, payload: Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)) });
const Input = Schema.Struct({
	parts: Schema.Array(
		Schema.Union([
			Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
			Schema.Struct({ type: Schema.Literal("image"), attachment: Schema.Struct({ digest: Schema.String, mediaType: Schema.String }) }),
		]),
	),
});
const Artifact = Schema.Struct({ digest: Schema.String, basename: Schema.String });
const artifact = Schema.decodeUnknownSync(Artifact);
const extensions: Readonly<Record<string, string>> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const validateImages = (value: unknown, requireContent: (path: string) => void) => {
	for (const part of Schema.decodeUnknownSync(Input)(value).parts) {
		if (part.type === "image") requireContent(join("session-inputs", part.attachment.digest, `image.${extensions[part.attachment.mediaType]}`));
	}
};

const logIdentities = (database: DatabaseSync, seed: string | undefined) => {
	if (database.prepare("SELECT name FROM sqlite_master WHERE name = 'log_shape'").get() !== undefined)
		return Schema.decodeUnknownSync(Schema.Array(Identity))(database.prepare("SELECT logId FROM log_shape").all());
	return [{ logId: seed }];
};

const validateFact = (fact: typeof Fact.Type, requireCursor: (cursor: typeof Cursor.Type) => void, requireContent: (path: string) => void) => {
	if (fact.name === "SessionProviderEvent") requireCursor(Schema.decodeUnknownSync(Cursor)(fact.payload));
	if (fact.name === "ArtifactLanded") {
		const value = artifact(fact.payload);
		requireContent(join("artifacts", value.digest, value.basename));
	}
	if (fact.name === "InputRecorded") validateImages(fact.payload, requireContent);
};

export const validateEvidence = (directory: string, runnerFiles: readonly { readonly path: string; readonly seed: string }[]) =>
	fixtureIO(async () => {
		const logs = runnerFiles.map((file) => new DatabaseSync(join(directory, file.path), { readOnly: true }));
		const server = new DatabaseSync(join(directory, "server", "journal.db"), { readOnly: true });
		try {
			const identities = logs.map((database, index) => ({
				database,
				identities: logIdentities(database, runnerFiles[index]?.seed),
			}));
			const requireCursor = (reference: typeof Cursor.Type) => {
				const found = identities.some(
					({ database, identities: names }) =>
						names.some(({ logId }) => logId === reference.logId) &&
						database.prepare("SELECT cursor FROM runner_log WHERE cursor = ?").get(reference.cursor) !== undefined,
				);
				if (!found)
					throw new Error(
						`Missing runner evidence ${reference.logId} at cursor ${reference.cursor}; capture was not archived. Inspect source history and capture ordering.`,
					);
			};
			const tables = server.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'runner_cursor'").all();
			const cursors =
				tables.length === 0 ? [] : Schema.decodeUnknownSync(Schema.Array(Cursor))(server.prepare("SELECT logId, cursor FROM runner_cursor").all());
			for (const cursor of cursors) requireCursor(cursor);
			const requireContent = (path: string) => {
				if (!existsSync(join(directory, path)))
					throw new Error(
						`Missing captured content ${path}; capture was not archived. Inspect the source reference before accepting degraded evidence.`,
					);
			};
			for (const fact of Schema.decodeUnknownSync(Schema.Array(Fact))(server.prepare("SELECT name, payload FROM journal").all()))
				validateFact(fact, requireCursor, requireContent);
		} finally {
			server.close();
			for (const database of logs) database.close();
		}
	});
