import { realpathSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { LegacyArtifact } from "#adapters/artifact-custody-identity.ts";
import {
	hashArtifactCustody,
	type VerifiedArtifact,
	verifyLegacyArtifact,
} from "#adapters/artifact-custody-verification.ts";
import type { DatabaseFilePath } from "#data-dir.ts";

const CUSTODY_FROM =
	"sha256:7bed1b5421dd224911e12335de498920dc5a617efc49f82a1f0f06cf52446bbe";
const CUSTODY_TO =
	"sha256:ad241ac4e17b7cf0d359e8be138d3865b236385bb508923ba5a0b5422bc307bc";
const ITEM_PREFIX = "migration:artifact-custody:item:";
const MANIFEST_KEY = "migration:artifact-custody:manifest";

const storageHashOf = (contract: unknown): string | undefined => {
	if (
		typeof contract !== "object" ||
		contract === null ||
		!("storage" in contract)
	) {
		return undefined;
	}
	const storage = contract.storage;
	if (
		typeof storage !== "object" ||
		storage === null ||
		!("storageHash" in storage)
	) {
		return undefined;
	}
	return typeof storage.storageHash === "string"
		? storage.storageHash
		: undefined;
};

const currentStorageHash = (database: DatabaseSync): string | undefined => {
	const marker = database
		.prepare(
			`SELECT 1 AS "found" FROM sqlite_master WHERE type = 'table' AND name = '_prisma_marker'`,
		)
		.get();
	if (marker === undefined) {
		return undefined;
	}
	const row = database
		.prepare(`SELECT "core_hash" FROM "_prisma_marker" WHERE "space" = 'app'`)
		.get();
	return typeof row?.core_hash === "string" ? row.core_hash : undefined;
};

const readLegacyArtifacts = (database: DatabaseSync): LegacyArtifact[] =>
	database
		.prepare(`SELECT "id", "uri" FROM "artifact" ORDER BY "id"`)
		.all()
		.map((row) => {
			if (typeof row.id !== "string" || typeof row.uri !== "string") {
				throw new Error("legacy Artifact row has invalid identity or URI");
			}
			return { id: row.id, uri: row.uri };
		});

const stageVerifiedArtifacts = (
	database: DatabaseSync,
	verified: ReadonlyArray<VerifiedArtifact>,
): void => {
	const snapshot = hashArtifactCustody(
		verified.map((artifact) => `${artifact.id}\0${artifact.uri}`).join("\0"),
	);
	database.exec("BEGIN IMMEDIATE");
	try {
		database
			.prepare(`DELETE FROM "appMeta" WHERE "key" = ? OR "key" LIKE ?`)
			.run(MANIFEST_KEY, `${ITEM_PREFIX}%`);
		const insert = database.prepare(
			`INSERT INTO "appMeta" ("key", "value") VALUES (?, ?)`,
		);
		insert.run(
			MANIFEST_KEY,
			JSON.stringify({
				count: verified.length,
				predecessor: CUSTODY_FROM,
				snapshot,
			}),
		);
		for (const artifact of verified) {
			insert.run(
				`${ITEM_PREFIX}${artifact.id}`,
				JSON.stringify({
					basename: artifact.basename,
					byteSize: artifact.byteSize,
					digest: artifact.digest,
					id: artifact.id,
					legacyUri: artifact.uri,
					snapshot,
				}),
			);
		}
		database.exec("COMMIT");
	} catch (cause) {
		database.exec("ROLLBACK");
		throw cause;
	}
};

export const prepareArtifactCustodyMigration = (target: {
	readonly artifactsRoot?: string;
	readonly contract: unknown;
	readonly database: DatabaseFilePath;
}): void => {
	if (storageHashOf(target.contract) !== CUSTODY_TO) {
		return;
	}
	const database = new DatabaseSync(target.database);
	try {
		if (currentStorageHash(database) !== CUSTODY_FROM) {
			return;
		}
		if (target.artifactsRoot === undefined) {
			throw new Error("artifact custody migration requires artifactsRoot");
		}
		const artifacts = readLegacyArtifacts(database);
		const canonicalRoot =
			artifacts.length === 0 ? "" : realpathSync(target.artifactsRoot);
		const failures: string[] = [];
		const verified: VerifiedArtifact[] = [];
		for (const artifact of artifacts) {
			try {
				verified.push(verifyLegacyArtifact(artifact, canonicalRoot));
			} catch (cause) {
				failures.push(
					`${artifact.id}: ${cause instanceof Error ? cause.message : String(cause)}`,
				);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`artifact custody migration refused: ${failures.join("; ")}`,
			);
		}
		stageVerifiedArtifacts(database, verified);
	} finally {
		database.close();
	}
};
