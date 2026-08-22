import {
	anyOf,
	applications,
	fence,
	files,
	importFrom,
	modules,
	packages,
	sanctioned,
	workspaceExcept,
} from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";

export const ownershipPolicy = [
	fence("electron-only-in-desktop")
		.because(
			"Only the desktop shell touches Electron APIs. Core packages stay host-agnostic.",
		)
		.forbidsImportsFrom(packages.all)
		.to(modules.named("electron"))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.module("electron"),
			),
			legal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inPackage("plugin-api", "src/backend.ts"),
			),
		}),
	fence("nothing-imports-desktop")
		.because("Nothing imports the app shell; composition flows downward only.")
		.forbidsImportsFrom(packages.all)
		.to(applications.all)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inApplication("desktop", "src/main.ts"),
			),
			legal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inPackage("plugin-api", "src/backend.ts"),
			),
		}),
	fence("persistence-owns-the-db")
		.because(
			"Database access exists only behind the persistence package. No feature code ever holds a raw DB handle.",
		)
		.forbidsImportsFrom(
			workspaceExcept("persistence").sanctioning(
				sanctioned("dev trace sink")
					.because(
						"The dev trace sink records finished spans and log entries into a file of its own in the dev data directory, pruned to the most recent runs. What it writes is a debugging aid rather than durable truth, so it must never enter the app's schema, its migrations, or the write path domain work contends for, and a packaged run provides it no tracer at all. Its own file is the reason it holds its own handle.",
					)
					.permitting("trace-sink"),
			),
		)
		.to(
			anyOf(
				modules.named("node:sqlite"),
				modules.under("@prisma-next"),
				modules.named("@shivaedev/effect-prisma"),
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.module("@shivaedev/effect-prisma"),
			),
			legal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inPackage("plugin-api", "src/backend.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
