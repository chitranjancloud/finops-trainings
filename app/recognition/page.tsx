import Awards from "@/components/Awards";
import Partners from "@/components/Partners";
import SessionShowcase from "@/components/SessionShowcase";
import Trusted from "@/components/Trusted";

export default function RecognitionPage() {
  return <main><header className="bg-slate-50 px-6 py-16"><div className="mx-auto max-w-7xl"><p className="text-sm font-semibold text-blue-700">Our learning community</p><h1 className="mt-3 text-4xl font-bold text-slate-950">Learner stories, sessions, and recognition.</h1><p className="mt-4 max-w-2xl leading-7 text-slate-600">Get to know our training community and explore highlights from our programs.</p></div></header><Partners /><SessionShowcase /><Trusted /><Awards /></main>;
}
