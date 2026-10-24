import CorporateStaticPage from "@/components/CorporateStaticPage";

export default function PrivacyPolicyPage() {
  return (
    <CorporateStaticPage
      eyebrow="Policy"
      title="Privacy Policy"
      description="How FinOps Trainings handles learner, inquiry, enrollment, payment, and communication data."
      points={[
        "We collect only the data required for enrollment, course access, payments, support, and communication.",
        "Payment details are processed through configured payment providers and are not stored as raw card data.",
        "Learner records, submissions, and feedback are used to provide training support and improve delivery quality.",
        "Users can contact the team for data correction, communication preferences, or account-related requests.",
      ]}
    />
  );
}
