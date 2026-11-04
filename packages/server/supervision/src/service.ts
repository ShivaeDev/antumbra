import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { failLoop } from "#commands/fail-loop.ts";
import { forgetLoop } from "#commands/forget-loop.ts";
import { resumeLoop } from "#commands/resume-loop.ts";
import { stoppedLoops } from "#queries/stopped-loops.ts";
export const Supervision = defineService({
	id: "@antumbra/server-supervision/Supervision",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ failLoop, forgetLoop, resumeLoop, stoppedLoops }),
});
