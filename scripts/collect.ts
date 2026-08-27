import { parseArgs } from "../src/lib/cli";
import { runCollect, runIngest, runStatusAndMeta } from "../src/lib/pipeline";

async function main(): Promise<void> {
  const args = parseArgs();
  const limit = typeof args.limit === "string" ? Number.parseInt(args.limit, 10) : undefined;

  await runIngest();
  const { errors } = await runCollect({ limit: Number.isFinite(limit) ? limit : undefined });
  await runStatusAndMeta(errors);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
