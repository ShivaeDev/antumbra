import type { AgentBackend } from "@antumbra/plugin-api";

export const imageInputBackendsOf = (
	backends: ReadonlyMap<string, AgentBackend>,
): ReadonlySet<string> =>
	new Set(
		[...backends].flatMap(([tag, backend]) =>
			backend.capabilities.imageInput ? [tag] : [],
		),
	);
