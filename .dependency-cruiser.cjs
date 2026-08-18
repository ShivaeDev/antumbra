const rule = ({ from, name, rationale, to }) => ({
	comment: rationale,
	from: { path: from },
	name,
	severity: "error",
	to: { path: to },
});

const alternatives = (names) => names.join("|");
const capabilityNames = [
	"domain-feeds",
	"pieces",
	"boards",
	"artifacts",
	"reports",
	"repos",
	"session-event-journal",
];
const capabilityPattern = alternatives(capabilityNames);
const domainPattern = alternatives(["domain", ...capabilityNames]);
const adapterPattern = "backend-[^/]+|github|runner-[^/]+";
const vocabularyConsumers = [
	{
		allowed: ["board"],
		from: "^packages/agent-tools(?:/|$)",
		name: "agent-tools-uses-board-vocabulary",
		rationale:
			"Agent tools name Board inputs, not unrelated runtime, Change, or Session-event vocabulary.",
	},
	{
		allowed: ["agent-runtime"],
		from: "^packages/artifacts(?:/|$)",
		name: "artifacts-uses-agent-runtime-vocabulary",
		rationale:
			"Artifacts decode Moorage ownership and do not own Board, Change, or Session-event language.",
	},
	{
		allowed: ["session-events"],
		from: "^packages/backend-(claude|codex)(?:/|$)",
		name: "agent-backends-use-session-event-vocabulary",
		rationale:
			"Agent backends translate provider traffic into neutral Session events and do not consume unrelated domain vocabulary.",
	},
	{
		allowed: ["board"],
		from: "^packages/boards(?:/|$)",
		name: "boards-uses-board-vocabulary",
		rationale:
			"Boards owns Board storage invariants and names only the Board subject from the shared vocabulary leaf.",
	},
	{
		allowed: ["change", "session-events"],
		from: "^packages/plugin-api(?:/|$)",
		name: "plugin-api-uses-port-vocabulary",
		rationale:
			"The driven ports name Change and Session-event vocabulary, not application runtime or Board subjects.",
	},
	{
		allowed: ["session-events"],
		from: "^packages/renderer(?:/|$)",
		name: "renderer-uses-session-event-vocabulary",
		rationale:
			"The renderer receives other public words through contract; Session events are its only direct vocabulary subject.",
	},
	{
		allowed: ["session-events"],
		from: "^packages/session-event-journal(?:/|$)",
		name: "session-event-journal-uses-session-event-vocabulary",
		rationale:
			"The Session event journal persists neutral Session events and does not consume unrelated vocabulary subjects.",
	},
];

const vocabularyConsumerRule = ({ allowed, from, name, rationale }) =>
	rule({
		from,
		name,
		rationale,
		to: `^packages/vocabulary/src/(?!${alternatives(
			allowed.map((subject) => `${subject}(?:\\.ts|/)`),
		)})`,
	});

module.exports = {
	forbidden: [
		...vocabularyConsumers.map(vocabularyConsumerRule),
		rule({
			rationale:
				"The desktop consumes the application-facing domain facade. Leaf capability Layers stay composed inside that facade so the app does not become a service graph by hand.",
			from: "^apps/desktop",
			name: "desktop-uses-domain-facade",
			to: `^packages/(${capabilityPattern})(?:/|$)`,
		}),
		rule({
			rationale:
				"Git is process infrastructure beneath the adapters that move branches: the local runner cuts worktrees, and the GitHub host pushes one before it proposes a change. No other package consumes that mechanism directly; a new caller must earn and document a real layer edge.",
			from: "^packages/(?!git(?:/|$)|github(?:/|$)|runner-local(?:/|$))|^apps/",
			name: "git-only-below-branch-adapters",
			to: "^packages/git(?:/|$)",
		}),
		rule({
			rationale:
				"The GitHub host implements a driven port; it never reaches into application scheduling or durable state.",
			from: "^packages/github(?:/|$)",
			name: "github-imports-no-application-state",
			to: "^packages/(kernel|persistence)(?:/|$)",
		}),
		rule({
			rationale:
				"The GitHub host implements a driven port; client contracts, shared language, agent tools, and presentation stay outside that adapter.",
			from: "^packages/github(?:/|$)",
			name: "github-imports-no-client-or-agent-surface",
			to: "^packages/(contract|vocabulary|agent-tools|renderer)(?:/|$)",
		}),
		rule({
			rationale:
				"The GitHub host is one provider adapter and never composes another backend or runner implementation.",
			from: "^packages/github(?:/|$)",
			name: "github-imports-no-sibling-adapters",
			to: "^packages/(backend-[^/]+|runner-[^/]+)(?:/|$)",
		}),
		rule({
			rationale:
				"The renderer is a pure projection; runtime capabilities, ports, agent tools, scheduling, and persistence stay outside the view.",
			from: "^packages/renderer(?:/|$)",
			name: "renderer-imports-no-runtime",
			to: `^packages/(${domainPattern}|plugin-api|agent-tools|kernel|persistence)(?:/|$)`,
		}),
		rule({
			rationale:
				"The renderer is host-agnostic and never reaches process infrastructure or provider implementations.",
			from: "^packages/renderer(?:/|$)",
			name: "renderer-imports-no-host-infrastructure",
			to: `^packages/(git|${adapterPattern})(?:/|$)`,
		}),
		rule({
			rationale:
				"Adapters implement the driven ports and nothing else. A backend, runner or change host that reaches for the domain has stopped being replaceable — it would drag the use cases into every provider it serves.",
			from: `^packages/(${adapterPattern})`,
			name: "adapters-never-import-the-domain",
			to: `^packages/(${domainPattern})(?:/|$)`,
		}),
		rule({
			rationale:
				"The domain speaks to ports, never to the providers behind them. Naming a concrete adapter or a vendor SDK here would weld one provider into the use cases and make the next one a rewrite.",
			from: "^packages/domain",
			name: "domain-knows-ports-not-providers",
			to: "^packages/(backend-[^/]+|github|runner-[^/]+)|(^|/)@anthropic-ai/claude-agent-sdk(/|$)",
		}),
		rule({
			rationale:
				"Only the desktop shell touches Electron APIs. Core packages stay host-agnostic.",
			from: "^packages/",
			name: "electron-only-in-desktop",
			to: "(^|/)electron(/|$)",
		}),
		rule({
			rationale:
				"The contract package is the IDL. Runtime capabilities, ports, adapters, process infrastructure, persistence, presentation, and the app stay outside it.",
			from: "^packages/contract(?:/|$)",
			name: "contract-imports-no-runtime-or-presentation",
			to: `^packages/(${domainPattern}|plugin-api|agent-tools|kernel|persistence|git|renderer|${adapterPattern})(?:/|$)`,
		}),
		rule({
			rationale:
				"The tools an agent acts through are transport-free. Runtime capabilities, process infrastructure, persistence, contracts, presentation, providers, and harnesses stay outside them.",
			from: "^packages/agent-tools(?:/|$)",
			name: "agent-tools-imports-no-runtime-or-implementation",
			to: `^packages/(${domainPattern}|kernel|persistence|contract|renderer|git|${adapterPattern})(?:/|$)`,
		}),
		rule({
			rationale:
				"Nothing imports the app shell; composition flows downward only.",
			from: "^packages/",
			name: "nothing-imports-desktop",
			to: "^apps/",
		}),
		rule({
			rationale:
				"Database access exists only behind the persistence package. No feature code ever holds a raw DB handle.",
			from: "^(apps|packages)/(?!persistence)",
			name: "persistence-owns-the-db",
			to: "^node:sqlite$|(^|/)@prisma-next(/|$)|(^|/)@shivaedev/effect-prisma(/|$)",
		}),
	],
	options: {
		doNotFollow: { path: "node_modules" },
		exclude: { path: "(^|/)(dist|out|node_modules)(/|$)" },
		tsPreCompilationDeps: true,
	},
};
