export const defaultPartners = [
  { name: "Microsoft", logo: "/microsoft.png", description: "Enterprise cloud, productivity, and certification learning partner.", website: "", displayOrder: 1 },
  { name: "Cisco", logo: "/cisco.png", description: "Networking and security training aligned with industry demand.", website: "", displayOrder: 2 },
  { name: "VMware", logo: "/Vmware.svg.png", description: "Virtualization and infrastructure learning for modern IT teams.", website: "", displayOrder: 3 },
  { name: "Oracle", logo: "/oracle.png", description: "Database, cloud, and enterprise technology learning pathways.", website: "", displayOrder: 4 },
  { name: "Red Hat", logo: "/red-hat.svg", description: "Open-source, Linux, and automation skills for technical careers.", website: "", displayOrder: 5 },
  { name: "Dell", logo: "/Dell_EMC.svg.png", description: "Infrastructure and enterprise systems learning support.", website: "", displayOrder: 6 },
  {
    name: "AWS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    description: "Cloud skills and certification routes for scalable digital teams.",
    website: "",
    displayOrder: 7,
  },
];

export const defaultTrustedCompanies = [
  { name: "Cisco", logo: "/cisco.png", website: "", displayOrder: 1 },
  { name: "VMware", logo: "/Vmware.svg.png", website: "", displayOrder: 2 },
  { name: "Oracle", logo: "/oracle.png", website: "", displayOrder: 3 },
  { name: "Red Hat", logo: "/red-hat.svg", website: "", displayOrder: 4 },
  { name: "Dell EMC", logo: "/Dell_EMC.svg.png", website: "", displayOrder: 5 },
  {
    name: "AWS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    website: "",
    displayOrder: 6,
  },
  { name: "Microsoft", logo: "/microsoft.png", website: "", displayOrder: 7 },
];

export const defaultTestimonials = [
  {
    name: "Michael Chen",
    role: "Cloud Engineer @ Google",
    content:
      "The trainers at FinOps are exceptional. The hands-on labs and real-world scenarios helped me clear my AWS Architect exam on the first try!",
    rating: 5,
    displayOrder: 1,
  },
  {
    name: "Sarah Jenkins",
    role: "FinOps Lead @ Amazon",
    content:
      "This course bridged the gap between finance and engineering perfectly. The community access alone is worth the investment.",
    rating: 5,
    displayOrder: 2,
  },
  {
    name: "David Kumar",
    role: "Solutions Architect",
    content:
      "Excellent curriculum. I was able to implement cloud cost-saving strategies at my company immediately after the second week.",
    rating: 4,
    displayOrder: 3,
  },
];

export const defaultWebinars = [
  {
    name: "Muddasir Mahadik",
    title: "Container Orchestration Using Openshift",
    date: "21 Apr 2026",
    time: "02:00 PM IST",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
    role: "Solution Architect",
    displayOrder: 1,
  },
  {
    name: "Shalini Raghuwanshi",
    title: "AI Business Professional Exam Prep",
    date: "21 Apr 2026",
    time: "03:00 PM IST",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
    role: "AI Consultant",
    displayOrder: 2,
  },
  {
    name: "Sagar Sagar",
    title: "Static Routing Fundamentals",
    date: "21 Apr 2026",
    time: "04:00 PM IST",
    img: "https://randomuser.me/api/portraits/men/76.jpg",
    role: "Network Engineer",
    displayOrder: 3,
  },
];

export const defaultHeroBanners = [
  {
    eyebrow: "Limited Offer",
    title: "Cloud FinOps Masterclass",
    description:
      "Enroll this week and unlock live mentor sessions, premium lab access, and downloadable learning material.",
    image: "/hero.jpg",
    ctaLabel: "View Course",
    ctaHref: "/courses/pl-300",
    badge: "Save 20%",
    accent: "cyan",
    displayOrder: 1,
    isActive: true,
  },
  {
    eyebrow: "Career Track",
    title: "Azure Administrator Batch",
    description:
      "Join an instructor-led Azure program with batch chat, activity tracking, and course resources.",
    image: "/customized_training.png",
    ctaLabel: "Reserve Seat",
    ctaHref: "/courses/az-104",
    badge: "New Batch",
    accent: "purple",
    displayOrder: 2,
    isActive: true,
  },
  {
    eyebrow: "Webinar",
    title: "Free Expert-Led Sessions",
    description:
      "Attend upcoming webinars and learn directly from cloud, security, and AI specialists.",
    image: "/destination_training.png",
    ctaLabel: "Upcoming Webinars",
    ctaHref: "/learning/upcoming-webinars",
    badge: "Free",
    accent: "emerald",
    displayOrder: 3,
    isActive: true,
  },
];
