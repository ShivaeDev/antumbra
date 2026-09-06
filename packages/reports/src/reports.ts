import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { landReport } from "#land.ts";
import { readReport } from "#read.ts";

export const Reports = defineService({
	id: "@antumbra/reports/Reports",
	initialize: Effect.void,
	methods: () => ({
		land: landReport,
		read: readReport,
	}),
	requires: [Database, DomainFeeds],
});

export const ReportsLive = Reports.layer;
