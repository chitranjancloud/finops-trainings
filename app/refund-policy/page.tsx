import CorporateStaticPage from "@/components/CorporateStaticPage";

export default function RefundPolicyPage() {
  return (
    <CorporateStaticPage
      eyebrow="Policy"
      title="Refund Policy"
      description="Transparent payment and refund guidance for courses, webinars, and corporate training programs."
      points={[
        "Refund eligibility depends on program type, access status, batch start date, and service usage.",
        "Approved refunds are processed through the original payment channel whenever supported.",
        "Webinar registrations may be rescheduled or credited where refund windows have closed.",
        "For corporate programs, refund and reschedule terms are governed by the agreed proposal or contract.",
      ]}
    />
  );
}
