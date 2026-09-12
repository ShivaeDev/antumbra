import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import type { ToolSet } from "@antumbra/platform-runner/tools.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { toolSets } from "#tools/catalog.ts";

export const freeze = Effect.fn("Tools.freeze")(function* (context: Omit<ToolContext, "callId"> & { readonly role: string }) {
	let version: keyof typeof toolSets = context.role === "smoother" ? "smoothing-v1" : "crew-v1";
	if (context.role === "captain" && context.voyageId !== undefined && context.pieceId === undefined) {
		const live = yield* Live;
		const found = yield* Stream.runHead(live.live(byId, { id: VoyageId.make(context.voyageId) }));
		const voyage = Option.getOrNull(found);
		version = voyage?.kind === "flagship" ? "flagship-v1" : "captain-v1";
	}
	return { version, tools: toolSets[version].map((tool) => tool.spec) } satisfies ToolSet;
});
