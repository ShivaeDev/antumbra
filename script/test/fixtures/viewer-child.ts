import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const token = randomUUID();
const server = createServer((request, response) => {
	if (request.headers.authorization !== `Bearer ${token}`) {
		response.writeHead(401).end();
		return;
	}
	response.setHeader("content-type", "application/json");
	if (request.url === "/__fixture/stop") {
		response.end(JSON.stringify({ stopped: true }));
		server.close();
	} else response.end(JSON.stringify({ token, failure: null }));
});
server.listen(0, "127.0.0.1", () => {
	const address = server.address();
	if (address && typeof address !== "string") process.send?.({ url: `http://127.0.0.1:${address.port}`, token });
});
