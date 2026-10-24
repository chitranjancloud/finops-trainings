import CorporateStaticPage from "@/components/CorporateStaticPage";

export default function CareersPage() {
  return (
    <CorporateStaticPage
      eyebrow="Careers"
      title="Join FinOps Trainings"
      description="We work with trainers, mentors, counselors, support specialists, and technology professionals."
      points={[
        "Trainer opportunities for Microsoft, AWS, Azure, AI, security, FinOps, Cisco, ISO, and business skills.",
        "Remote and hybrid support roles for learner success, operations, and corporate training delivery.",
        "Mentor roles for interview preparation, resume review, labs, and project support.",
        "Send your profile through the contact page with your specialization and availability.",
      ]}
    />
  );
}
