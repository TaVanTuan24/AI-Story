const fs = require("node:fs");
const path = require("node:path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const uriFile = path.resolve(process.cwd(), ".tmp-mongo-uri.txt");

async function main() {
  const server = await MongoMemoryServer.create();
  fs.writeFileSync(uriFile, server.getUri(), "utf8");
  process.stdout.write(`${server.getUri()}\n`);

  const shutdown = async () => {
    try {
      await server.stop();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 60_000);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
