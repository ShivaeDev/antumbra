import type { QuayGroup, QuayRow, QuayView } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import {
	filterQuayChanges,
	quayChanges,
	repositoriesOf,
} from "#quay/changes.ts";

const row = (
	id: string,
	group: QuayGroup,
	repoId: string,
	repoName: string,
	over: Partial<QuayRow> = {},
): QuayRow => ({
	baseRef: "main",
	body: "Why this pull request matters.",
	change: {
		activityAt: "2026-08-19T09:20:00.000Z",
		checks: "green",
		externalId: id.slice(-1),
		host: "github",
		id,
		isDraft: group === "draft",
		mergeable: "clean",
		observedAt: "2026-08-19T09:22:00.000Z",
		repoId,
		repoName,
		review: "approved",
		stage: "open",
		title: id === "change-1" ? "Chart the northern reef" : "Mark the inlet",
		url: `https://github.test/${repoName}/pull/${id.slice(-1)}`,
	},
	group,
	headRef: `work/${id}`,
	headSha: "0123456789abcdef",
	originSessionId: "session-1",
	pieceId: "piece-1",
	pieceTitle: "Soundings",
	voyageId: "voyage-1",
	voyageName: "Chart the reef",
	...over,
});

const view: QuayView = {
	hosts: [],
	pieces: [],
	rows: [
		row("change-1", "alongside", "repo-1", "shoals"),
		row("change-1", "alongside", "repo-1", "shoals", {
			pieceId: "piece-2",
			pieceTitle: "Chart",
		}),
		row("change-2", "draft", "repo-2", "harbour", {
			pieceTitle: "Entrance",
			voyageName: "Harbour patrol",
		}),
	],
};

describe("the quay's pull request list", () => {
	it("lists each pull request once while retaining every berth", () => {
		const changes = quayChanges(view);

		expect(changes.map((change) => change.change.id)).toEqual([
			"change-1",
			"change-2",
		]);
		expect(
			changes[0]?.berthings.map((berthing) => berthing.pieceTitle),
		).toEqual(["Soundings", "Chart"]);
	});

	it("derives truthful repository choices from the pull requests", () => {
		expect(repositoriesOf(quayChanges(view))).toEqual([
			{ id: "repo-2", name: "harbour" },
			{ id: "repo-1", name: "shoals" },
		]);
	});

	it("filters by attention state, repository, title, number and work", () => {
		const changes = quayChanges(view);
		expect(
			filterQuayChanges(changes, {
				query: "northern",
				repositoryId: "repo-1",
				status: "alongside",
			}).map((change) => change.change.id),
		).toEqual(["change-1"]);
		expect(
			filterQuayChanges(changes, {
				query: "#2",
				repositoryId: null,
				status: "all",
			}).map((change) => change.change.id),
		).toEqual(["change-2"]);
		expect(
			filterQuayChanges(changes, {
				query: "chart",
				repositoryId: null,
				status: "all",
			}).map((change) => change.change.id),
		).toEqual(["change-1"]);
	});
});
