import { artifactsTools } from "#tools/artifacts/tools.ts";
import { writeSummaryTool } from "#tools/boards/summary.ts";
import { boardTools } from "#tools/boards/tools.ts";
import { changesTools } from "#tools/changes/handlers.ts";
import { captainPieceTools } from "#tools/pieces/tools.ts";
import { landReportTool } from "#tools/reports/land.ts";
import { readReportTool } from "#tools/reports/read.ts";
import { repoTools } from "#tools/repos/tools.ts";
import { captainRulingTools, commonRulingTools, flagshipRulingTools } from "#tools/rulings/tools.ts";
import { commonVoyageTools, flagshipVoyageTools } from "#tools/voyages/tools.ts";

const common = [...commonVoyageTools, readReportTool, ...boardTools, ...commonRulingTools];
const captain = [...captainPieceTools, ...common, ...captainRulingTools];

export const toolSets = {
	"smoothing-v1": [writeSummaryTool],
	"crew-v1": [landReportTool, ...artifactsTools, ...changesTools, ...common],
	"captain-v1": captain,
	"flagship-v1": [...captain, ...repoTools, ...flagshipVoyageTools, ...flagshipRulingTools],
};

export const handlers = new Map(
	Object.values(toolSets)
		.flat()
		.map((tool) => [tool.spec.name, tool]),
);
