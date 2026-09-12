import { answered, it } from "@antumbra/app-testing/entry.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { noting, opening, reefBoard } from "#test/kit.ts";

it.app("nests the narrowest summaries while keeping smooth admiral notes standing", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.boards.write(noting("shoal", "the shoal shelves fast"));
	yield* app.api.boards.write({ ...noting("order", "keep west"), author: null, register: "smooth" });
	const summary = { author: "smoother", board: reefBoard, body: "The approach", coversFrom: 1, coversTo: 2, level: "day" } as const;
	yield* app.api.boards.summarize({ ...summary, requestId: Id.Request.make("day") });
	yield* app.api.boards.summarize({ ...summary, requestId: Id.Request.make("piece"), level: "piece", coversTo: 3 });
	const displayed = yield* answered(app.api.boards.display({ board: reefBoard }));
	expect(displayed.map((node) => node.entry.id)).toEqual(["piece", "entry:order"]);
	expect(displayed[0]?.children.map((node) => node.entry.id)).toEqual(["day"]);
	expect(displayed[0]?.children[0]?.children.map((node) => node.entry.id)).toEqual(["entry:shoal"]);
});
