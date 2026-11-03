import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { open } from "#open.ts";
import { quiet } from "#quiet.ts";
import { byId, list, progress } from "#read.ts";
import { resume } from "#resume.ts";
import { setFocus } from "#set-focus.ts";

export const Voyages = defineService({
	id: "@antumbra/server-voyages/Voyages",
	requires: [VoyageHistory],
	initialize: Effect.void,
	methods: () => ({ open, setFocus, quiet, resume, byId, list, progress }),
});
