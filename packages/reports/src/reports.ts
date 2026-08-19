import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { PieceNotFound } from "@antumbra/pieces";
import { Context, Effect, Layer, type Option } from "effect";
import { landReport } from "#land.ts";
import type { ReportInput, ReportReading, ReportRow } from "#model.ts";
import { readReport } from "#read.ts";

export class Reports extends Context.Service<
	Reports,
	{
		readonly land: (
			input: ReportInput,
		) => Effect.Effect<ReportRow, PieceNotFound | PrismaError>;
		readonly read: (
			reportId: string,
		) => Effect.Effect<Option.Option<ReportReading>, PrismaError>;
	}
>()("@antumbra/reports/Reports") {}

export const ReportsLive = Layer.effect(Reports)(
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(
				Context.add(DomainFeeds, feeds),
				Context.add(Writer, writer),
			),
		);
		return {
			land: (input) => Effect.provide(landReport(input), context),
			read: (reportId) => Effect.provide(readReport(reportId), context),
		};
	}),
);
