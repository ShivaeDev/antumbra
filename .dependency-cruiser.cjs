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
		allowed: ["board-vocabulary", "persistence", "domain-feeds"],
		rationale:
			"Boards owns durable board and mailbox invariants. It may name the neutral Board vocabulary, write through persistence, and publish through domain-feeds, but it never reaches up into the domain facade, ports, adapters, or app.",
		name: "boards",
	},
	{
		allowed: [
			"agent-runtime-vocabulary",
			"pieces",
			"persistence",
			"domain-feeds",
		],
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

module.exports = {
	forbidden: [
		...capabilityPackages.map(capabilityRule),
		rule({
			rationale:
				"Agent runtime vocabulary is the neutral language shared by domain recovery and artifact ownership. It stays a leaf so neither capability drags the other's implementation with it.",
			from: "^packages/agent-runtime-vocabulary",
			name: "agent-runtime-vocabulary-is-a-leaf",
			to: "^packages/(?!agent-runtime-vocabulary)|^apps/",
		}),
		rule({
			rationale:
				"Board vocabulary is the neutral language shared by Board storage, agent tools, and public views. It stays a leaf so no consumer drags another layer with it.",
			from: "^packages/board-vocabulary",
			name: "board-vocabulary-is-a-leaf",
			to: "^packages/(?!board-vocabulary)|^apps/",
		}),
		rule({
			rationale:
				"Change vocabulary is the neutral language shared by hosts, durable projections, the public contract, and views. It stays a leaf so no consumer drags another layer with it.",
			from: "^packages/change-vocabulary",
			name: "change-vocabulary-is-a-leaf",
			to: "^packages/(?!change-vocabulary)|^apps/",
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
				"The renderer is a pure web app: public vocabulary reaches it through contract, and session-events is its only direct vocabulary dependency. Electron, the desktop shell, and every other workspace package are out of bounds — this keeps windows disposable and a future remote surface possible.",
			from: "^packages/renderer",
			name: "renderer-pure-web",
			to: `(^|/)electron(/|$)|${allowOnly(["renderer", "contract", "session-events"])}`,
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
				"The contract package is the IDL. It may name neutral Board, Change, and session-event vocabularies, but imports no capability, adapter, domain, or app layer.",
			from: "^packages/contract",
			name: "contract-has-only-vocabulary-dependency",
			to: "^packages/(?!contract(?:/|$)|board-vocabulary(?:/|$)|change-vocabulary(?:/|$)|session-events(?:/|$))|^apps/",
		}),
		rule({
			rationale:
				"The session-events package is the vocabulary every side speaks — ports, domain, and the renderer alike. It stays a leaf so importing it never drags a layer along.",
			from: "^packages/session-events",
			name: "session-events-is-a-leaf",
			to: "^packages/(?!session-events)|^apps/",
		}),
		rule({
			rationale:
				"The tools an agent acts through are transport-free: they name the port and neutral Board vocabulary, never a capability, provider, or harness.",
			from: "^packages/agent-tools",
			name: "agent-tools-knows-only-the-port",
			to: "^packages/(?!agent-tools(?:/|$)|board-vocabulary(?:/|$)|plugin-api(?:/|$))|^apps/",
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
