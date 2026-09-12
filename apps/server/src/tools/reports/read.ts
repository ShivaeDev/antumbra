import { ReportId } from "@antumbra/domain-reports/ids.ts";
import { forVoyage } from "@antumbra/domain-reports/queries/for-voyage.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { bind, defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Schema, Stream } from "effect";

export const readReportSpec = defineTool({
	description: "Read a landed Report in full by ID.",
	input: Schema.Struct({ reportId: ReportId.annotate({ description: "The id of a report landed on your voyage, as `read_voyage` shows it." }) }),
	name: "read_report",
});

const OUT_OF_REACH = "no report with that id is on your voyage";

export const readReportTool = bind(readReportSpec, (context, input) =>
	Effect.gen(function* () {
		yield* Effect.logDebug("agent tool called", { agentId: context.agentId, sessionId: context.sessionId, name: readReportSpec.name });
		if (context.voyageId === undefined) return { ok: false, text: OUT_OF_REACH };
		const live = yield* Live;
		const report = Option.getOrNull(yield* Stream.runHead(live.live(forVoyage, { id: input.reportId, voyageId: VoyageId.make(context.voyageId) })));
		if (report === null) return { ok: false, text: OUT_OF_REACH };
		const byline = report.authorAgentId === null ? "report" : `report by ${report.authorAgentId}`;
		return { ok: true, text: [`# ${report.title}`, byline, "", report.body].join("\n") };
	}).pipe(
		Effect.catchCause((cause) =>
			Effect.logWarning("read_report could not read", { agentId: context.agentId }, cause).pipe(
				Effect.as({ ok: false, text: "the report could not be read" }),
			),
		),
	),
);
