const rule = ({ from, name, rationale, to }) => ({
	comment: rationale,
	from: { path: from },
	name,
	severity: "error",
	to: { path: to },
});

const packagePath = (name) => `${name}(?:/|$)`;
const alternatives = (names) => names.join("|");
const allowOnly = (names) =>
	`^packages/(?!${alternatives(names.map(packagePath))})|^apps/`;

const capabilityPackages = [
	{
		allowed: [],
		rationale:
			"Domain feeds are a notification leaf. Importing another workspace layer here would make every capability that publishes a signal depend on that layer too.",
		name: "domain-feeds",
	},
	{
		allowed: ["persistence", "domain-feeds"],
		rationale:
			"Pieces owns one domain capability. It may write through persistence and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "pieces",
	},
	{
		allowed: ["vocabulary", "persistence", "domain-feeds"],
		rationale:
			"Boards owns durable board and mailbox invariants. It may name the neutral Board vocabulary, write through persistence, and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "boards",
	},
	{
		allowed: ["vocabulary", "pieces", "persistence", "domain-feeds"],
		rationale:
			"Artifacts owns durable outcome publication. It may decode Moorage ownership through the runtime vocabulary, validate pieces, write through persistence, and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "artifacts",
	},
	{
		allowed: ["pieces", "persistence", "domain-feeds"],
		rationale:
			"Reports owns durable report landing. It may validate pieces, write through persistence, and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "reports",
	},
	{
		allowed: ["persistence", "domain-feeds"],
		rationale:
			"Repos owns the application repository registry. It may write through persistence and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "repos",
	},
	{
		allowed: ["vocabulary", "persistence", "domain-feeds"],
		rationale:
			"The Session event journal owns durable event sequencing and native Session identity correlation. It may speak the neutral Session event vocabulary, write through persistence, and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "session-event-journal",
	},
];

const capabilityRule = ({ allowed, name, rationale }) =>
	rule({
		from: `^packages/${name}`,
		name: `${name}-${allowed.length === 0 ? "is-a-leaf" : "has-narrow-dependencies"}`,
		rationale,
		to: allowOnly([name, ...allowed]),
	});

const capabilityNames = capabilityPackages.map(({ name }) => name);
const capabilityPattern = alternatives(capabilityNames);
const domainPattern = alternatives(["domain", ...capabilityNames]);
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
		...capabilityPackages.map(capabilityRule),
		...vocabularyConsumers.map(vocabularyConsumerRule),
		rule({
			rationale:
				"Vocabulary is Antumbra's neutral language leaf. Explicit subject subpaths let capabilities, ports, contracts, and views share canonical words without importing one another or creating a generic root barrel.",
			from: "^packages/vocabulary(?:/|$)",
			name: "vocabulary-is-a-leaf",
			to: "^packages/(?!vocabulary(?:/|$))|^apps/",
		}),
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
				"The GitHub host implements one driven port for one provider. It may name that port, the git mechanism it pushes through, and Effect — nothing else. Reaching for the domain, the kernel or persistence would weld one forge into the use cases and make the second host a rewrite.",
			from: "^packages/github(?:/|$)",
			name: "github-implements-one-port",
			to: "^packages/(?!github(?:/|$)|git(?:/|$)|plugin-api(?:/|$))|^apps/",
		}),
		rule({
			rationale:
				"Git owns one semantic process boundary and stays below every workspace layer. It may depend on Effect's process port, never on an Antumbra package or app.",
			from: "^packages/git(?:/|$)",
			name: "git-imports-no-workspace-layer",
			to: "^packages/(?!git(?:/|$))|^apps/",
		}),
		rule({
			rationale:
				"The renderer is a pure web app: public vocabulary reaches it through contract, and vocabulary/session-events is its only direct vocabulary dependency. Electron, the desktop shell, and every other workspace package are out of bounds — this keeps windows disposable and a future remote surface possible.",
			from: "^packages/renderer",
			name: "renderer-pure-web",
			to: `(^|/)electron(/|$)|${allowOnly(["renderer", "contract", "vocabulary"])}`,
		}),
		rule({
			rationale:
				"Adapters implement the driven ports and nothing else. A backend, runner or change host that reaches for the domain has stopped being replaceable — it would drag the use cases into every provider it serves.",
			from: "^packages/(backend-[^/]+|github|runner-[^/]+)",
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
				"The contract package is the IDL. It may name subjects from the neutral vocabulary leaf, but imports no capability, adapter, domain, or app layer.",
			from: "^packages/contract",
			name: "contract-has-only-vocabulary-dependency",
			to: "^packages/(?!contract(?:/|$)|vocabulary(?:/|$))|^apps/",
		}),
		rule({
			rationale:
				"The tools an agent acts through are transport-free: they name the port and neutral vocabulary/board subject, never a capability, provider, or harness.",
			from: "^packages/agent-tools",
			name: "agent-tools-knows-only-the-port",
			to: "^packages/(?!agent-tools(?:/|$)|vocabulary(?:/|$)|plugin-api(?:/|$))|^apps/",
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
