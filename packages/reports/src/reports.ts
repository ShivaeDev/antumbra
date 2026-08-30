import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { landReport } from "#land.ts";
import { readReport } from "#read.ts";

const requirements = [Database, DomainFeeds] as const;

export const Reports = defineService({
	id: "@antumbra/reports/Reports",
	initialize: Effect.void,
	methods: () => ({
		land: landReport,
		read: readReport,
	}),
	requires: requirements,
});

export const ReportsLive = Reports.layer;
