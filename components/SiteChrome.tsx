"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Chatbot from "./Chatbot";
import WhatsAppButton from "./WhatsAppButton";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const portal = pathname === "/student" || pathname.startsWith("/student/") || pathname.startsWith("/admin-page");
  return <><a className="skip-link" href="#main-content">Skip to content</a>{!portal && <Navbar />}<div id={portal ? undefined : "main-content"} tabIndex={-1} className="flex-1">{children}</div>{!portal && <><Footer /><WhatsAppButton /><Chatbot /></>}</>;
}
