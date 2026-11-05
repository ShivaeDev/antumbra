import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { rejections } from "#commands/guard.ts";
import { rulingContextAdded } from "#facts/ruling-context-added.ts";
import { ruling } from "#rows/ruling.ts";
export const addContext = command("addContext", {
	input: { ...rulingContextAdded.payload, body: titled(rulingContextAdded.payload.body, { title: "Ask the requester", multiline: true }) },
	reads: [ruling],
	emits: rulingContextAdded,
	rejections: { ...rejections },
});
