import { parseArgs } from "../src/lib/cli";
import { runDailyCheck } from "../src/lib/daily-check";

async function main(): Promise<void> {
  const args = parseArgs();
  await runDailyCheck({ skipFetch: Boolean(args["skip-fetch"]) });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
