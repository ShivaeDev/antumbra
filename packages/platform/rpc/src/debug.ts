import { contract } from "@shivaedev/contract/contract.ts";
import { command } from "@shivaedev/contract/operation.ts";

export const DebugRpc = contract("debug", {
	commands: [command("rebuildProjections", { invalidates: () => [] })],
}).application;
