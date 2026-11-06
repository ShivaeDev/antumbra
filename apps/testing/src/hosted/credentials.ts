import { Owner } from "@antumbra/platform-access/policy.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { SettingsContract } from "@antumbra/server-settings/contract.ts";
import * as NodeWS from "@effect/platform-node/NodeWS";
import { makeClient } from "@shivaedev/contract/bind.ts";

export const credentials = (url: string, token?: string) =>
	makeClient(SettingsContract.middleware(Owner), {
		url,
		group: SettingsContract.middleware(Owner).merge(RunnerRpc),
		...(token === undefined ? {} : { bearerToken: token }),
		webSocketConstructor: NodeWS.layerWebSocketConstructor,
	}).client;
