import {
	anyOf,
	applications,
	fence,
	files,
	importFrom,
	modules,
	packages,
} from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import {
	adapters,
	domainAndCapabilities,
	domainAndCapabilitiesExceptIntentDemand,
} from "#boundaries/policy/selectors.ts";

export const adapterPolicy = [
	fence("resource-reclamation-imports-no-domain-change-or-provider")
		.because(
			"Resource reclamation owns replaceable-resource claims and Runner cleanup through lower ports; Change truth is supplied through an ambient transaction read, while Domain, applications, and concrete providers stay outside the capability.",
		)
		.forbidsImportsFrom(packages.named("resource-reclamation"))
		.to(anyOf(applications.all, packages.named("domain", "changes"), adapters))
		.demonstratedBy({
			illegal: importFrom(
				files.inPackage(
					"resource-reclamation",
					"src/resource-reclaim-state.ts",
				),
			).to(files.inPackage("changes", "src/change-read.ts")),
			legal: importFrom(
				files.inPackage(
					"resource-reclamation",
					"src/resource-reclaim-state.ts",
				),
			).to(files.inPackage("persistence", "src/index.ts")),
		}),
	fence("intent-demand-imports-no-capability-truth")
		.because(
			"Intent demand bridges closed capability registrations to Kernel Intents; business truth, persistence, plugins, adapters, and applications stay outside that process-lifetime service.",
		)
		.forbidsImportsFrom(packages.named("intent-demand"))
		.to(
			anyOf(
				applications.all,
				domainAndCapabilitiesExceptIntentDemand,
				packages.named("persistence", "plugin-api"),
				adapters,
			),
		)
		.demonstratedBy({
			illegal: importFrom(files.inPackage("intent-demand", "src/layer.ts")).to(
				files.inPackage("domain", "src/domain.ts"),
			),
			legal: importFrom(files.inPackage("intent-demand", "src/layer.ts")).to(
				files.inPackage("kernel", "src/kernel.ts"),
			),
		}),
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
	fence("adapters-never-import-the-domain")
		.because(
			"Adapters implement the driven ports and nothing else. A backend, runner or change host that reaches for the domain has stopped being replaceable — it would drag the use cases into every provider it serves.",
		)
		.forbidsImportsFrom(adapters)
		.to(domainAndCapabilities)
		.demonstratedBy({
			illegal: importFrom(
				files.inPackage("backend-claude", "src/backend.ts"),
			).to(files.inPackage("domain", "src/domain.ts")),
			legal: importFrom(files.inPackage("backend-claude", "src/backend.ts")).to(
				files.inPackage("plugin-api", "src/backend.ts"),
			),
		}),
	fence("domain-knows-ports-not-providers")
		.because(
			"The domain speaks to ports, never to the providers behind them. Naming a concrete adapter or a vendor SDK here would weld one provider into the use cases and make the next one a rewrite.",
		)
		.forbidsImportsFrom(
			packages.named(
				"domain",
				"domain-feeds",
				"changes",
				"session-fabric",
				"sessions",
			),
		)
		.to(anyOf(adapters, modules.named("@anthropic-ai/claude-agent-sdk")))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inPackage("backend-codex", "src/backend.ts"),
			),
			legal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inPackage("plugin-api", "src/backend.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
