import Hero from "@/components/Hero";
import Courses from "@/components/Courses";
import LearningJourney from "@/components/LearningJourney";
import Testimonials from "@/components/Testimonials";
import Webinars from "@/components/Webinars";

export default function Home() {
  return <main className="bg-white text-slate-950"><Hero /><Courses /><Testimonials /><Webinars /><LearningJourney /></main>;
}
