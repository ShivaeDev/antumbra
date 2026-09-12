import { anyOf, fence, files, importFrom, modules, workspaceExcept } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";

export const ownershipPolicy = [
	fence("journal-owns-the-db")
		.because("Database access exists only behind the server journal. No feature code ever holds a raw DB handle.")
		.forbidsImportsFrom(
			workspaceExcept("server-journal").sanctioning({
				package: "platform-trace-sink",
				rationale:
					"The dev trace sink records finished spans and log entries into a file of its own in the dev data directory, pruned to the most recent runs. What it writes is a debugging aid rather than durable truth, so it must never enter the app's schema, its migrations, or the write path domain work contends for, and a packaged run provides it no tracer at all. Its own file is the reason it holds its own handle.",
				ruling: "dev trace sink",
			}),
		)
		.to(anyOf(modules.named("node:sqlite"), modules.under("@effect/sql-sqlite-node"), modules.under("effect/unstable/sql")))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("server/domains/pieces", "src/commands/launch.ts")).to(
				files.module("@effect/sql-sqlite-node/SqliteClient"),
			),
			legal: importFrom(files.inPackage("server/domains/pieces", "src/commands/launch.ts")).to(
				files.inPackage("server/domains/pieces", "src/rows/piece.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
