export { acquireTemporaryPersistence } from "@antumbra/persistence/testing";

import type { ChangeHost } from "@antumbra/plugin-api";

export {
	makeScriptedBackend,
	makeScriptedRunner,
	passiveRunner,
	rawOf,
	type ScriptedBackend,
	type ScriptedRunner,
	type ScriptedSession,
} from "@antumbra/testing-runtime";
export { callTool, completesTurn, endTurn, sessionFor } from "#test/session-reach.ts";

export const changeHostsOf = (...hosts: ReadonlyArray<ChangeHost>): ReadonlyMap<string, ChangeHost> =>
	new Map(hosts.map((host) => [host.tag, host] as const));
