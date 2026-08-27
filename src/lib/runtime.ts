/** Vercel has no writable data/ and no local Ollama. */
export const isHostedReadOnly = Boolean(process.env.VERCEL);

export const LOCAL_PIPELINE_MESSAGE =
  "Daily check requires a local machine with Ollama. This hosted dashboard is read-only.";
