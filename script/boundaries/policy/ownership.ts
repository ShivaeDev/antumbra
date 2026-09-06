import { anyOf, fence, files, importFrom, modules, workspaceExcept } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";

export const ownershipPolicy = [
	fence("persistence-owns-the-db")
		.because("Database access exists only behind the persistence package. No feature code ever holds a raw DB handle.")
		.forbidsImportsFrom(
			workspaceExcept("persistence").sanctioning({
				package: "trace-sink",
				rationale:
					"The dev trace sink records finished spans and log entries into a file of its own in the dev data directory, pruned to the most recent runs. What it writes is a debugging aid rather than durable truth, so it must never enter the app's schema, its migrations, or the write path domain work contends for, and a packaged run provides it no tracer at all. Its own file is the reason it holds its own handle.",
				ruling: "dev trace sink",
			}),
		)
		.to(anyOf(modules.named("node:sqlite"), modules.under("@prisma-next"), modules.named("@shivaedev/effect-prisma")))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("domain", "src/domain.ts")).to(files.module("@shivaedev/effect-prisma")),
			legal: importFrom(files.inPackage("domain", "src/domain.ts")).to(files.inPackage("plugin-api", "src/backend.ts")),
		}),
] as const satisfies readonly BoundaryRule[];
