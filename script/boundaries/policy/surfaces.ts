import {
	anyOf,
	applications,
	fence,
	files,
	importFrom,
	modules,
	packages,
	workspaceExcept,
} from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import {
	adapters,
	domainAndCapabilities,
} from "#boundaries/policy/selectors.ts";

export const surfacePolicy = [
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
	fence("contract-imports-no-runtime-or-presentation")
		.because(
			"The contract package is the IDL. Runtime capabilities, ports, adapters, process infrastructure, persistence, presentation, and the app stay outside it.",
		)
		.forbidsImportsFrom(packages.named("contract"))
		.to(
			anyOf(
				domainAndCapabilities,
				packages.named(
					"plugin-api",
					"agent-tools",
					"kernel",
					"persistence",
					"git",
					"renderer",
				),
				adapters,
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("contract", "src/contract.ts")).to(
				files.inPackage("plugin-api", "src/backend.ts"),
			),
			legal: importFrom(files.inPackage("contract", "src/contract.ts")).to(
				files.inPackage("vocabulary", "src/change.ts"),
			),
		}),
	fence("agent-tools-imports-no-runtime-or-implementation")
		.because(
			"The tools an agent acts through are transport-free. Runtime capabilities, process infrastructure, persistence, contracts, presentation, providers, and harnesses stay outside them.",
		)
		.forbidsImportsFrom(packages.named("agent-tools"))
		.to(
			anyOf(
				domainAndCapabilities,
				packages.named("kernel", "persistence", "contract", "renderer", "git"),
				adapters,
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(
				files.inPackage("persistence", "src/database.ts"),
			),
			legal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(
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
		.forbidsImportsFrom(workspaceExcept("persistence"))
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
