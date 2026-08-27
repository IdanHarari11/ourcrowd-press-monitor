import { ingestCompanies } from "../src/lib/ingest";
import { log } from "../src/lib/cli";

async function main(): Promise<void> {
  const count = await ingestCompanies();
  log(`Wrote data/companies.json (${count} companies)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
