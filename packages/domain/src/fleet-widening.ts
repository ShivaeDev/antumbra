import type { DirectTool } from "@antumbra/plugin-api";

// why: the flagship reads across hulls by holding a wider form of a tool the
// captain set already binds, not a second tool under a second name. A fleet
// binding that shares a captain binding's name stands in its place, so the
// caller is offered one tool of that name whichever set it holds.
export const widenedBy = (captainTools: ReadonlyArray<DirectTool>, fleetTools: ReadonlyArray<DirectTool>): ReadonlyArray<DirectTool> => [
	...captainTools.filter((tool) => !fleetTools.some((wider) => wider.name === tool.name)),
	...fleetTools,
];
