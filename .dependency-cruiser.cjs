module.exports = {
	forbidden: [
		{
			comment:
				"Git is process infrastructure beneath the local runner. No other current package consumes that mechanism directly; a new caller must earn and document a real layer edge.",
			from: {
				path: "^packages/(?!git(?:/|$)|runner-local(?:/|$))|^apps/",
			},
			name: "git-only-below-local-runner",
			severity: "error",
			to: { path: "^packages/git" },
		},
		{
			comment:
				"Git owns one semantic process boundary and stays below every workspace layer. It may depend on Effect's process port, never on an Antumbra package or app.",
			from: { path: "^packages/git" },
			name: "git-imports-no-workspace-layer",
			severity: "error",
			to: { path: "^packages/(?!git(?:/|$))|^apps/" },
		},
		{
			comment:
				"The renderer is a pure web app: it may depend on the contract and session-events packages only. Electron, the desktop shell, and every core package are out of bounds — this is what keeps windows disposable and a future remote surface possible.",
			from: { path: "^packages/renderer" },
			name: "renderer-pure-web",
			severity: "error",
			to: {
				path: "(^|/)electron(/|$)|^apps/|^packages/(agent-tools|kernel|domain|backend-[^/]+|runner-[^/]+|persistence|plugin-api)",
			},
		},
		{
			comment:
				"Adapters implement the driven ports and nothing else. A backend or runner that reaches for the domain has stopped being replaceable — it would drag the use cases into every provider it serves.",
			from: { path: "^packages/(backend-[^/]+|runner-[^/]+)" },
			name: "adapters-never-import-the-domain",
			severity: "error",
			to: { path: "^packages/domain" },
		},
		{
			comment:
				"The domain speaks to ports, never to the providers behind them. Naming a concrete adapter or a vendor SDK here would weld one provider into the use cases and make the next one a rewrite.",
			from: { path: "^packages/domain" },
			name: "domain-knows-ports-not-providers",
			severity: "error",
			to: {
				path: "^packages/(backend-[^/]+|runner-[^/]+)|(^|/)@anthropic-ai/claude-agent-sdk(/|$)",
			},
		},
		{
			comment:
				"Only the desktop shell touches Electron APIs. Core packages stay host-agnostic.",
			from: { path: "^packages/" },
			name: "electron-only-in-desktop",
			severity: "error",
			to: { path: "(^|/)electron(/|$)" },
		},
		{
			comment:
				"The contract package is the IDL — a leaf. It imports no other workspace package.",
			from: { path: "^packages/contract" },
			name: "contract-is-a-leaf",
			severity: "error",
			to: { path: "^packages/(?!contract)|^apps/" },
		},
		{
			comment:
				"The session-events package is the vocabulary every side speaks — ports, domain, and the renderer alike. It stays a leaf so importing it never drags a layer along.",
			from: { path: "^packages/session-events" },
			name: "session-events-is-a-leaf",
			severity: "error",
			to: { path: "^packages/(?!session-events)|^apps/" },
		},
		{
			comment:
				"The tools an agent acts through are transport-free: they name the port that declares what a tool is and nothing else. A tool package that reached for the domain, a provider, or a harness would stop being the one definition every backend maps.",
			from: { path: "^packages/agent-tools" },
			name: "agent-tools-knows-only-the-port",
			severity: "error",
			to: {
				path: "^packages/(?!agent-tools(?:/|$)|plugin-api(?:/|$))|^apps/",
			},
		},
		{
			comment:
				"Nothing imports the app shell; composition flows downward only.",
			from: { path: "^packages/" },
			name: "nothing-imports-desktop",
			severity: "error",
			to: { path: "^apps/" },
		},
		{
			comment:
				"Database access exists only behind the persistence package. No feature code ever holds a raw DB handle.",
			from: { path: "^(apps|packages)/(?!persistence)" },
			name: "persistence-owns-the-db",
			severity: "error",
			to: {
				path: "^node:sqlite$|(^|/)@prisma-next(/|$)|(^|/)@shivaedev/effect-prisma(/|$)",
			},
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		exclude: { path: "(^|/)(dist|out|node_modules)(/|$)" },
		tsPreCompilationDeps: true,
	},
};
