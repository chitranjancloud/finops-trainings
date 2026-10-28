import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

async function main() {
  loadEnvConfig(process.cwd());
  const origin = "https://finops-trainings.vercel.app";
  const Bucket = process.env.S3_MEDIA_BUCKET;
  if (!Bucket || !process.env.AWS_REGION) throw new Error("Configure S3_MEDIA_BUCKET and AWS_REGION.");
  const client = new S3Client({ region: process.env.AWS_REGION });
  const current = await client.send(new GetBucketCorsCommand({ Bucket }));
  const rules = current.CORSRules || [];
  const allowed = rules.some((rule) => rule.AllowedOrigins?.includes(origin) && ["GET", "HEAD"].every((method) => rule.AllowedMethods?.includes(method)));
  if (allowed) { console.info("Vercel playback origin already allowed; no configuration changed."); return; }
  if (!process.argv.includes("--apply")) { console.info(JSON.stringify({ origin, methods: ["GET", "HEAD"], existingRules: rules.length, apply: false })); return; }
  if (rules.some((rule) => rule.ID === "FinOpsVercelPlayback")) throw new Error("Existing playback rule needs manual review.");
  const backup = path.join(process.cwd(), "node_modules", ".cache", "s3-cors-before-vercel.json");
  await mkdir(path.dirname(backup), { recursive: true });
  await writeFile(backup, JSON.stringify({ CORSRules: rules }, null, 2));
  await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: [...rules, {
    ID: "FinOpsVercelPlayback", AllowedOrigins: [origin], AllowedMethods: ["GET", "HEAD"], AllowedHeaders: ["range"],
    ExposeHeaders: ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"], MaxAgeSeconds: 300,
  }] } }));
  const verified = await client.send(new GetBucketCorsCommand({ Bucket }));
  if (!verified.CORSRules?.some((rule) => rule.ID === "FinOpsVercelPlayback" && rule.AllowedOrigins?.includes(origin))) throw new Error("CORS configuration verification failed.");
  console.info(JSON.stringify({ applied: true, origin, existingRulesPreserved: rules.length, methods: ["GET", "HEAD"] }));
}
main().catch((error) => { console.error("Playback CORS setup failed", { name: error instanceof Error ? error.name : "UnknownError" }); process.exitCode = 1; });
