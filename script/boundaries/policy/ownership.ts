import { anyOf, fence, files, importFrom, modules, workspaceExcept } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";

export const ownershipPolicy = [
	fence("storage-owns-the-db")
		.because("Database access exists only behind the server storage services. No feature code ever holds a raw DB handle.")
		.forbidsImportsFrom(workspaceExcept("server-storage"))
		.to(anyOf(modules.named("node:sqlite"), modules.under("@effect/sql-sqlite-node"), modules.under("effect/sql")))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("server/domains/pieces", "src/commands/launch.ts")).to(
				files.module("@effect/sql-sqlite-node/SqliteClient"),
			),
			legal: importFrom(files.inPackage("server/domains/pieces", "src/commands/launch.ts")).to(
				files.inPackage("server/domains/pieces", "src/rows/piece.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
