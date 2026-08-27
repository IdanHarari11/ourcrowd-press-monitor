import { parseArgs } from "../src/lib/cli";
import { log } from "../src/lib/cli";
import { pingClassifier } from "../src/lib/classifier";
import { runClassify, runStatusAndMeta } from "../src/lib/pipeline";

async function main(): Promise<void> {
  const args = parseArgs();
  const limit = typeof args.limit === "string" ? Number.parseInt(args.limit, 10) : undefined;

  await pingClassifier();
  log("Classifier is ready");
  await runClassify({ limit: Number.isFinite(limit) ? limit : undefined });
  await runStatusAndMeta();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
