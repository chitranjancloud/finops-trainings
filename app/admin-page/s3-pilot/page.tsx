import S3UploadPanel from "@/components/S3UploadPanel";
export const dynamic = "force-dynamic";
export default function S3PilotPage() {
  if (process.env.S3_UPLOAD_ENABLED !== "true") return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">S3 pilot is disabled</h1><p>Existing SharePoint uploads remain available.</p></main>;
  return <main className="mx-auto max-w-4xl p-8"><S3UploadPanel /></main>;
}
