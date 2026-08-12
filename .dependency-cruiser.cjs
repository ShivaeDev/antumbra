module.exports = {
	forbidden: [
		{
			comment:
				"The renderer is a pure web app: it may depend on the contract package only. Electron, the desktop shell, and every core package are out of bounds — this is what keeps windows disposable and a future remote surface possible.",
			from: { path: "^packages/renderer" },
			name: "renderer-pure-web",
			severity: "error",
			to: {
				path: "(^|/)electron(/|$)|^apps/|^packages/(kernel|backends|runners|persistence|plugin-api)",
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
			to: { path: "^node:sqlite$|(^|/)@prisma-next(/|$)" },
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		exclude: { path: "(^|/)(dist|out|node_modules)(/|$)" },
		tsPreCompilationDeps: true,
	},
};
