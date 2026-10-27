import S3VideoPlayer from "@/components/S3VideoPlayer";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function S3PilotPlayback({ params }: { params: Promise<{ assetId: string }> }) {
  if (process.env.S3_PLAYBACK_ENABLED !== "true") return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">S3 playback pilot is disabled</h1></main>;
  const { assetId } = await params;
  return <main className="mx-auto max-w-4xl p-8"><h1 className="mb-5 text-2xl font-bold">Private course video</h1><S3VideoPlayer key={assetId} assetId={assetId} /></main>;
}
