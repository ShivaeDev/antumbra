import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { read } from "#quay/read.ts";

export const Quay = defineService({
	id: "@antumbra/domain/Quay",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Changes, Database, Repos],
});
