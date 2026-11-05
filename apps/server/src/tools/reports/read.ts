import { forVoyage } from "@antumbra/domain-reports/queries/for-voyage.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { bind, defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { ReportId } from "@antumbra/platform-vocabulary/reports-ids.ts";
import { Reports } from "@antumbra/server-reports/service.ts";
import { Effect, Option, Schema, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { keysOf } from "#keys.ts";

export const readReportSpec = defineTool({
	description: "Read a landed Report in full by ID.",
	input: Schema.Struct({ reportId: ReportId.annotate({ description: "The id of a report landed on your voyage, as `read_voyage` shows it." }) }),
	name: "read_report",
});

const OUT_OF_REACH = "no report with that id is on your voyage";

export const readReportTool = bind(readReportSpec, (context, input) =>
	Effect.gen(function* () {
		const reportsService = yield* Reports;

		yield* Effect.logDebug("agent tool called", { agentId: context.agentId, sessionId: context.sessionId, name: readReportSpec.name });
		if (context.voyageId === undefined) return { ok: false, text: OUT_OF_REACH };

		const report = Option.getOrNull(
			yield* Stream.runHead(
				stream(keysOf(forVoyage.reads, forVoyage.scope?.({ id: input.reportId, voyageId: VoyageId.make(context.voyageId) })))(
					reportsService.forVoyage({ id: input.reportId, voyageId: VoyageId.make(context.voyageId) }).pipe(Effect.orDie),
				),
			),
		);
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
