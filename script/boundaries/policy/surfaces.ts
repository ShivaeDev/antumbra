import { anyOf, applications, fence, files, importFrom, packages } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import { adapters, domainAndCapabilities } from "#boundaries/policy/selectors.ts";

export const surfacePolicy = [
	fence("contract-imports-no-runtime-or-presentation")
		.because(
			"The contract package is the IDL. Runtime capabilities, ports, adapters, process infrastructure, persistence, presentation, and the app stay outside it.",
		)
		.forbidsImportsFrom(packages.named("contract"))
		.to(anyOf(domainAndCapabilities, packages.named("plugin-api", "agent-tools", "kernel", "persistence", "git", "renderer"), adapters))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("contract", "src/contract.ts")).to(files.inPackage("plugin-api", "src/backend.ts")),
			legal: importFrom(files.inPackage("contract", "src/contract.ts")).to(files.inPackage("vocabulary", "src/change.ts")),
		}),
	fence("agent-tools-imports-no-runtime-or-implementation")
		.because(
			"The tools an agent acts through are transport-free. Runtime capabilities, process infrastructure, persistence, contracts, presentation, providers, and harnesses stay outside them.",
		)
		.forbidsImportsFrom(packages.named("agent-tools"))
		.to(anyOf(domainAndCapabilities, packages.named("kernel", "persistence", "contract", "renderer", "git"), adapters))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(files.inPackage("persistence", "src/database.ts")),
			legal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(files.inPackage("plugin-api", "src/backend.ts")),
		}),
	fence("prompts-imports-no-caller")
		.because(
			"The prompt catalog is the whole of what an Agent can be told, and it sits beneath everything that tells it. A template that reached for domain truth, a port, a store or a view would make the words a function of the caller's layer instead of the blanks it was handed, and the catalog would stop being one directory a reader can trust to hold them all.",
		)
		.forbidsImportsFrom(packages.named("prompts"))
		.to(
			anyOf(
				applications.all,
				domainAndCapabilities,
				packages.named("agent-tools", "contract", "git", "harness", "kernel", "persistence", "plugin-api", "renderer"),
				adapters,
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("prompts", "src/situations.ts")).to(files.inPackage("changes", "src/change-read.ts")),
			legal: importFrom(files.inPackage("sessions", "src/session-send.ts")).to(files.inPackage("prompts", "src/index.ts")),
		}),
	fence("skills-imports-no-caller")
		.because(
			"A skill is a file the harness reads for itself, and the package that holds them names the layout the harnesses load and nothing else. Reaching for domain truth, a port or a view would make a skill's words a function of the layer that delivered them, and the directory would stop being one a reader can copy to a harness and trust.",
		)
		.forbidsImportsFrom(packages.named("skills"))
		.to(
			anyOf(
				applications.all,
				domainAndCapabilities,
				packages.named("agent-tools", "contract", "git", "harness", "kernel", "persistence", "plugin-api", "prompts", "renderer"),
				adapters,
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("skills", "src/index.ts")).to(files.inPackage("plugin-api", "src/backend.ts")),
			legal: importFrom(files.inPackage("backend-codex", "src/plugin.ts")).to(files.inPackage("skills", "src/index.ts")),
		}),
] as const satisfies readonly BoundaryRule[];
