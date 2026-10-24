"use client";

export default function CertificatePrintButton({ certificateCode }: { certificateCode: string }) {
  const markDownloaded = async () => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    await fetch(`/api/certificates/${certificateCode}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id || "",
        sessionToken: localStorage.getItem("sessionToken") || "",
        deviceId: localStorage.getItem("deviceId") || "",
      }),
    }).catch(() => {});
    window.print();
  };

  return (
    <button
      onClick={markDownloaded}
      className="rounded-xl bg-[#2563eb] px-4 py-2 font-bold text-white"
    >
      Download Certificate PDF
    </button>
  );
}
