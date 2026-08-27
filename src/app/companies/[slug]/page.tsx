import Link from "next/link";
import { AppShell, SimpleHeader } from "@/components/app-shell";
import { SentimentBadge, SentimentDistribution, StatusChip } from "@/components/sentiment";
import { loadDashboardData } from "@/lib/dashboard";
import { deskEdition, formatDateTime, relevantMentionsForCompany } from "@/lib/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadDashboardData();
  const company = data.companies.find((item) => item.id === slug);
  if (!company) notFound();

  const status = data.statuses.find((item) => item.companyId === slug);
  const mentions = relevantMentionsForCompany(data.mentions, slug);
  const { edition, stamp } = deskEdition(data.meta);

  return (
    <AppShell header={<SimpleHeader />} footer={<p className="desk-footer">{edition} · {stamp}</p>}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <Link href="/" className="w-fit text-[12px] text-text-secondary hover:text-text-primary">
          ← Desk
        </Link>
        <header className="panel grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="border-b border-border px-4 py-4 lg:border-r lg:border-b-0">
            <p className="text-[11px] tracking-[0.08em] text-text-secondary uppercase">Portfolio company</p>
            <h1 className="mt-2 text-[1.5rem] leading-[1.1] font-semibold tracking-[-0.03em]">{company.name}</h1>
            {company.aliases.length > 0 ? (
              <p className="mt-2 text-sm text-text-secondary">Also known as {company.aliases.join(", ")}</p>
            ) : null}
          </div>
          <div className="flex flex-col justify-between gap-4 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] tracking-[0.08em] text-text-secondary uppercase">This quarter</p>
              {status ? <StatusChip status={status} /> : null}
            </div>
            {status ? (
              <SentimentDistribution
                positive={status.positiveCount}
                negative={status.negativeCount}
                neutral={status.neutralCount}
              />
            ) : null}
          </div>
        </header>
        <section className="panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2">
            <h2 className="text-[15px] font-semibold">Press mentions</h2>
            <p className="text-[11px] text-text-secondary">Original source URLs</p>
          </div>
          {mentions.length === 0 ? (
            <p className="state-copy">No press mentions found for this period.</p>
          ) : (
            <ul>
              {mentions.map((mention) => (
                <li key={mention.id} className="border-t border-border px-4 py-3 first:border-t-0">
                  <p className="text-[11px] text-text-secondary">
                    {formatDateTime(mention.publishedAt)} · {mention.sourceName}
                  </p>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-medium hover:text-accent"
                  >
                    {mention.title}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                  {mention.rationale ? <p className="mt-1 max-w-[62ch] text-sm text-text-secondary">{mention.rationale}</p> : null}
                  <div className="mt-2">
                    <SentimentBadge sentiment={mention.sentiment} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
