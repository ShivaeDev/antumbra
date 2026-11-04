import { row } from "@antumbra/platform-feature/row.ts";
import { BoardEntry } from "@antumbra/platform-vocabulary/boards.ts";
export const boardEntry = row("boardEntry", BoardEntry.fields, { key: "id", scope: "board" });
