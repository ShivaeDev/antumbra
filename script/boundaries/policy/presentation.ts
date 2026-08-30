import { anyOf, fence, files, importFrom, packages } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import {
	adapters,
	domainAndCapabilities,
} from "#boundaries/policy/selectors.ts";

export const presentationPolicy = [
	fence("renderer-imports-no-runtime")
		.because(
			"The renderer is a pure projection; runtime capabilities, ports, agent tools, scheduling, and persistence stay outside the view.",
		)
		.forbidsImportsFrom(packages.named("renderer"))
		.to(
			anyOf(
				domainAndCapabilities,
				packages.named("plugin-api", "agent-tools", "kernel", "persistence"),
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("renderer", "src/view.ts")).to(
				files.inPackage("domain", "src/domain.ts"),
			),
			legal: importFrom(files.inPackage("renderer", "src/view.ts")).to(
				files.inPackage("contract", "src/contract.ts"),
			),
		}),
	fence("renderer-imports-no-host-infrastructure")
		.because(
			"The renderer is host-agnostic and never reaches process infrastructure or provider implementations.",
		)
		.forbidsImportsFrom(packages.named("renderer"))
		.to(anyOf(packages.named("git"), adapters))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("renderer", "src/view.ts")).to(
				files.inPackage("github", "src/host.ts"),
			),
			legal: importFrom(files.inPackage("renderer", "src/view.ts")).to(
				files.inPackage("contract", "src/contract.ts"),
			),
		}),
	fence("harness-imports-no-runtime-or-host")
		.because(
			"The browser harness stands in for the desktop shell and nothing else: it composes the contract's router over the shipped fixtures and mounts the renderer. Reaching a real capability, port, provider, scheduler, or store would make it a second application rather than a way to look at the first.",
		)
		.forbidsImportsFrom(packages.named("harness"))
		.to(
			anyOf(
				domainAndCapabilities,
				packages.named(
					"plugin-api",
					"agent-tools",
					"kernel",
					"persistence",
					"git",
				),
				adapters,
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("harness", "src/bridge.ts")).to(
				files.inPackage("domain", "src/domain.ts"),
			),
			legal: importFrom(files.inPackage("harness", "src/bridge.ts")).to(
				files.inPackage("contract", "src/contract.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
