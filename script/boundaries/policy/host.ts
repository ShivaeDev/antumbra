import {
	anyOf,
	applications,
	fence,
	files,
	importFrom,
	packages,
	workspaceExcept,
} from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import {
	agentBackends,
	capabilities,
	runners,
} from "#boundaries/policy/selectors.ts";

export const hostPolicy = [
	fence("desktop-uses-domain-facade")
		.because(
			"The desktop consumes the application-facing domain facade. Leaf capability Layers stay composed inside that facade so the app does not become a service graph by hand.",
		)
		.forbidsImportsFrom(applications.named("desktop"))
		.to(capabilities)
		.demonstratedBy({
			illegal: importFrom(files.inApplication("desktop", "src/main.ts")).to(
				files.inPackage("pieces", "src/piece.ts"),
			),
			legal: importFrom(files.inApplication("desktop", "src/main.ts")).to(
				files.inPackage("domain", "src/domain.ts"),
			),
		}),
	fence("git-only-below-branch-adapters")
		.because(
			"Git is process infrastructure beneath the adapters that move branches: the local runner cuts worktrees, and the GitHub host pushes one before it proposes a change. No other package consumes that mechanism directly; a new caller must earn and document a real layer edge.",
		)
		.forbidsImportsFrom(workspaceExcept("git", "github", "runner-local"))
		.to(packages.named("git"))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("domain", "src/domain.ts")).to(
				files.inPackage("git", "src/git.ts"),
			),
			legal: importFrom(files.inPackage("runner-local", "src/runner.ts")).to(
				files.inPackage("git", "src/git.ts"),
			),
		}),
	fence("github-imports-no-application-state")
		.because(
			"The GitHub host implements a driven port; it never reaches into application scheduling or durable state.",
		)
		.forbidsImportsFrom(packages.named("github"))
		.to(packages.named("kernel", "persistence"))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("github", "src/host.ts")).to(
				files.inPackage("persistence", "src/database.ts"),
			),
			legal: importFrom(files.inPackage("github", "src/host.ts")).to(
				files.inPackage("plugin-api", "src/change-host.ts"),
			),
		}),
	fence("github-imports-no-client-or-agent-surface")
		.because(
			"The GitHub host implements a driven port; client contracts, shared language, agent tools, and presentation stay outside that adapter.",
		)
		.forbidsImportsFrom(packages.named("github"))
		.to(packages.named("contract", "vocabulary", "agent-tools", "renderer"))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("github", "src/host.ts")).to(
				files.inPackage("contract", "src/contract.ts"),
			),
			legal: importFrom(files.inPackage("github", "src/host.ts")).to(
				files.inPackage("plugin-api", "src/change-host.ts"),
			),
		}),
	fence("github-imports-no-sibling-adapters")
		.because(
			"The GitHub host is one provider adapter and never composes another backend or runner implementation.",
		)
		.forbidsImportsFrom(packages.named("github"))
		.to(anyOf(agentBackends, runners))
		.demonstratedBy({
			illegal: importFrom(files.inPackage("github", "src/host.ts")).to(
				files.inPackage("backend-codex", "src/backend.ts"),
			),
			legal: importFrom(files.inPackage("github", "src/host.ts")).to(
				files.inPackage("plugin-api", "src/change-host.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
