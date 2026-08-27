import { readFile } from "node:fs/promises";
import { parseCompanyList } from "./companies";
import { SOURCE_COMPANIES_FILE } from "./paths";
import { saveCompanies } from "./storage";

export async function ingestCompanies(): Promise<number> {
  const text = await readFile(SOURCE_COMPANIES_FILE, "utf8");
  const companies = parseCompanyList(text);
  await saveCompanies(companies);
  return companies.length;
}
