import CorporateStaticPage from "@/components/CorporateStaticPage";

export default function TermsPage() {
  return (
    <CorporateStaticPage
      eyebrow="Policy"
      title="Terms & Conditions"
      description="Core terms for course enrollment, webinar registration, batch access, submissions, and website usage."
      points={[
        "Course access is provided after successful payment confirmation and batch allocation where required.",
        "Learners must not share login access, private course content, tests, assignments, recordings, or notes.",
        "Admins may restrict course access for policy violations, misuse, or batch-level blocking rules.",
        "Schedules, trainers, and webinar timings may be updated with reasonable notice through website notifications.",
      ]}
    />
  );
}
