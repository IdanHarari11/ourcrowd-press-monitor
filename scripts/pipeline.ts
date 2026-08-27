import { parseArgs } from "../src/lib/cli";
import { runPipeline } from "../src/lib/pipeline";

async function main(): Promise<void> {
  const args = parseArgs();
  const limit = typeof args.limit === "string" ? Number.parseInt(args.limit, 10) : undefined;

  await runPipeline({
    limit: Number.isFinite(limit) ? limit : undefined,
    skipCollect: Boolean(args["skip-collect"]),
    skipClassify: Boolean(args["skip-classify"]),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
