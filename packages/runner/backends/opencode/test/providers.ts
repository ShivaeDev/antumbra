export const PROVIDERS = {
	default: { opencode: "big-pickle", "opencode-go": "gpt-5.6-luna" },
	providers: [
		{
			id: "opencode-go",
			models: {
				"gpt-5.6-luna": {
					id: "gpt-5.6-luna",
					name: "GPT-5.6 Luna",
					providerID: "opencode-go",
					variants: {
						low: { reasoningEffort: "low" },
						high: { reasoningEffort: "high" },
						max: { reasoningEffort: "max" },
					},
				},
				"qwen3.7-max": {
					id: "qwen3.7-max",
					name: "Qwen3.7 Max",
					providerID: "opencode-go",
					variants: {},
				},
			},
			name: "OpenCode Go",
		},
		{
			id: "opencode",
			models: {
				"big-pickle": {
					id: "big-pickle",
					name: "Big Pickle",
					providerID: "opencode",
					variants: {},
				},
			},
			name: "OpenCode Zen",
		},
	],
};
