import CorporateStaticPage from "@/components/CorporateStaticPage";

export default function CaseStudiesPage() {
  return (
    <CorporateStaticPage
      eyebrow="Case Studies"
      title="Training Outcomes"
      description="Sample enterprise learning outcomes across cloud cost governance, security readiness, and AI adoption."
      points={[
        "Cloud cost governance program improved ownership, reporting cadence, and spend visibility for a distributed team.",
        "Security readiness cohort strengthened SOC workflows, audit documentation, and incident response confidence.",
        "AI productivity program helped business teams design reusable workflows for research, reporting, and analysis.",
        "Corporate upskilling programs can be customized by role, region, delivery model, and certification objective.",
      ]}
    />
  );
}
