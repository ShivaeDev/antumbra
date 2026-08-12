import { defineConfig } from "@prisma-next/sqlite/config";

export default defineConfig({
	contract: "contract.prisma",
	db: { connection: "unused.db" },
});
