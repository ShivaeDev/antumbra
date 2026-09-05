import type { Runner } from "@antumbra/plugin-api";
import { Effect } from "effect";

export const smootherRoot = (runner: Runner, agentId: string) => {
	const plan = runner.plan({ agentId, repos: [] });
	return Effect.as(runner.provision(plan), plan.root);
};
