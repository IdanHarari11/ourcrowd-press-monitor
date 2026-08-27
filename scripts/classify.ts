import { parseArgs } from "../src/lib/cli";
import { log } from "../src/lib/cli";
import { pingOllama } from "../src/lib/classifier/ollama";
import { runClassify, runStatusAndMeta } from "../src/lib/pipeline";

async function main(): Promise<void> {
  const args = parseArgs();
  const limit = typeof args.limit === "string" ? Number.parseInt(args.limit, 10) : undefined;

  await pingOllama();
  log("Ollama is reachable");
  await runClassify({ limit: Number.isFinite(limit) ? limit : undefined });
  await runStatusAndMeta();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
