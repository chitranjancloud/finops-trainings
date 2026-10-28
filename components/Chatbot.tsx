"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  ExternalLink,
  MessageCircle,
  Minimize2,
  Send,
  X,
} from "lucide-react";

type ChatLink = {
  label: string;
  href: string;
};

type ChatMessage = {
  role: "bot" | "user";
  text: string;
  links?: ChatLink[];
};

type CourseInfo = {
  title: string;
  slug: string;
  duration?: string;
  price?: string;
  level?: string;
  provider?: string;
  description?: string;
  sessions?: string;
  exam?: string;
  category?: string;
};

type WebinarInfo = {
  title?: string;
  name?: string;
  date?: string;
  time?: string;
};

type WebsiteRoute = {
  name: string;
  href: string;
  text: string;
};

const learningOptions: WebsiteRoute[] = [
  {
    name: "Live Online Training",
    href: "/learning/live-online-training",
    text: "live instructor-led online classes",
  },
  {
    name: "Classroom Training",
    href: "/learning/classroom-training",
    text: "in-person classroom training",
  },
  {
    name: "1-on-1 Training",
    href: "/learning/one-on-one-training",
    text: "personalized one-on-one mentoring",
  },
];

const sitePages: WebsiteRoute[] = [
  { name: "Home", href: "/", text: "main website homepage" },
  { name: "About", href: "/about", text: "company information page" },
  { name: "Contact", href: "/contact", text: "contact and inquiry page" },
  { name: "Internship Programs", href: "/internship-program", text: "internship program page" },
  { name: "Job Assistance", href: "/job-assistance", text: "career support page" },
  { name: "Partners", href: "/partners", text: "partners page" },
  { name: "Feedback", href: "/feedback", text: "feedback page" },
];

const quickQuestions = [
  "Show courses",
  "How to enroll?",
  "Learning options",
  "Upcoming webinars",
  "Contact support",
];

const stopWords = new Set([
  "a",
  "about",
  "all",
  "and",
  "are",
  "can",
  "do",
  "for",
  "give",
  "have",
  "how",
  "i",
  "in",
  "is",
  "me",
  "of",
  "on",
  "please",
  "show",
  "tell",
  "the",
  "to",
  "what",
  "where",
  "which",
  "with",
  "you",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ");
}

function getWords(value: string) {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

function scoreText(query: string, target: string) {
  const words = getWords(query);
  const haystack = normalize(target);

  return words.reduce((score, word) => {
    if (haystack.includes(word)) return score + (word.length > 3 ? 2 : 1);
    return score;
  }, 0);
}

function isVisibleRecord(item: any) {
  if (!item || typeof item !== "object") return false;
  if (item.isPublished === false || item.isActive === false || item.active === false) return false;

  const statusText = [item.status, item.state, item.visibility]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return !/(deleted|draft|inactive|archived|hidden|disabled|unpublished)/.test(statusText);
}

function formatCourse(course: CourseInfo) {
  const details = [
    course.duration ? `Duration: ${course.duration}` : "",
    course.price ? `Price: ${course.price}` : "",
    course.level ? `Level: ${course.level}` : "",
    course.provider ? `Provider: ${course.provider}` : "",
    course.sessions ? `Sessions: ${course.sessions}` : "",
    course.exam ? `Exam: ${course.exam}` : "",
  ].filter(Boolean);

  return `${course.title}${course.description ? `. ${course.description}` : ""}${
    details.length ? `\n${details.join(" | ")}` : ""
  }`;
}

export default function Chatbot() {
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [webinars, setWebinars] = useState<WebinarInfo[]>([]);
  const availableLearningOptions = learningOptions;
  const availableSitePages = sitePages;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hi, I am the FinOps website assistant. Ask me about current courses, learning options, enrollment, webinars, materials, login, or contact support.",
    },
  ]);

  const shouldHide = pathname.startsWith("/admin-page") || pathname === "/student/batches";

  useEffect(() => {
    if (shouldHide || !open) return;
    const controller = new AbortController();

    const fetchWebsiteData = async () => {
      try {
        const [courseRes, webinarRes] = await Promise.all([
          fetch("/api/courses", { signal: controller.signal }),
          fetch("/api/webinars", { signal: controller.signal }),
        ]);

        const courseData = await courseRes.json();
        const webinarData = await webinarRes.json();

        if (courseData.success && Array.isArray(courseData.courses)) {
          const dynamicCourses = courseData.courses
            .filter((course: any) => isVisibleRecord(course) && course.title && course.slug)
            .map((course: any) => ({
              title: course.title,
              slug: course.slug,
              duration: course.duration,
              price: course.price,
              level: course.level,
              provider: course.provider,
              description: course.description,
              sessions: course.sessions,
              exam: course.exam,
              category: course.tag || course.provider,
            }));

          setCourses(dynamicCourses);
        }

        if (webinarData.success && Array.isArray(webinarData.webinars)) {
          setWebinars(
            webinarData.webinars.filter(
              (webinar: any) => isVisibleRecord(webinar) && webinar.title
            )
          );
        }


      } catch (error) {
        console.log(error);
      }
    };

    fetchWebsiteData();
    return () => controller.abort();
  }, [shouldHide, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const courseIndex = useMemo(
    () =>
      courses.map((course) => ({
        course,
        text: [
          course.title,
          course.slug,
          course.category,
          course.description,
          course.duration,
          course.price,
          course.level,
          course.provider,
          course.sessions,
          course.exam,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [courses]
  );

  const getPageLink = (name: string) =>
    availableSitePages.find((page) => page.name.toLowerCase() === name.toLowerCase());

  const getLearningLink = (name: string) =>
    availableLearningOptions.find((page) => page.name.toLowerCase() === name.toLowerCase());

  const courseLinks = courses.slice(0, 4).map((course) => ({
    label: course.title,
    href: `/courses/${course.slug}`,
  }));

  const coursesUnavailableResponse: ChatMessage = {
    role: "bot",
    text: "I could not load the current course list right now. Please open the Courses section or contact support for the latest available programs.",
    links: [
      { label: "Courses", href: "/#top-courses" },
      ...(getPageLink("Contact") ? [{ label: "Contact", href: getPageLink("Contact")!.href }] : []),
    ],
  };

  const getBotResponse = (question: string): ChatMessage => {
    const text = normalize(question);

    if (/(hi|hello|hey|namaste|help)/.test(text)) {
      return {
        role: "bot",
        text: "I can help you find current courses, explain enrollment, locate available learning modes, share webinar details, and guide you to contact support.",
        links: [
          { label: "All Courses", href: "/#top-courses" },
          ...(getPageLink("Contact") ? [{ label: "Contact", href: getPageLink("Contact")!.href }] : []),
        ],
      };
    }

    if (/(login|sign in|signin|account)/.test(text)) {
      return {
        role: "bot",
        text: "Use Login from the website navigation. Students can log in to access their account, enrolled learning areas, and available student features.",
        links: [
          { label: "Login", href: "/login" },
          { label: "Sign Up", href: "/signup" },
        ],
      };
    }

    if (/(enroll|enrol|join|register|admission)/.test(text)) {
      if (!courses.length) return coursesUnavailableResponse;

      return {
        role: "bot",
        text: "Open any current course and use the enrollment option shown on that course page. The available learning content depends on what is currently assigned and published.",
        links: courseLinks.slice(0, 3),
      };
    }

    if (/(reserve|seat|payment|pay|razorpay|price|fees|cost)/.test(text)) {
      if (!courses.length) return coursesUnavailableResponse;

      const matched = courseIndex
        .map((item) => ({
          ...item,
          score: scoreText(question, item.text),
        }))
        .sort((a, b) => b.score - a.score)[0]?.course;

      return {
        role: "bot",
        text:
          matched && matched.price
            ? `${matched.title} price is currently shown as ${matched.price}. Open the course page for the latest enrollment and payment options.`
            : "Current course pages show the latest price, enrollment, and payment options when available.",
        links: matched ? [{ label: matched.title, href: `/courses/${matched.slug}` }] : courseLinks.slice(0, 3),
      };
    }

    if (/(pdf|material|download|video|brochure|access)/.test(text)) {
      if (!courses.length) return coursesUnavailableResponse;

      return {
        role: "bot",
        text: "Course videos, PDFs, and downloadable materials appear only where they are currently available for an enrolled student.",
        links: courseLinks.slice(0, 3),
      };
    }

    if (/(webinar|session|event|upcoming)/.test(text)) {
      const upcomingWebinarsLink = getLearningLink("Upcoming Webinars");

      if (!webinars.length) {
        return {
          role: "bot",
          text: "I could not load current webinar data right now. Please check the website webinar section for the latest available sessions.",
          links: [
            ...(upcomingWebinarsLink
              ? [{ label: upcomingWebinarsLink.name, href: upcomingWebinarsLink.href }]
              : []),
            { label: "Home Webinars", href: "/#webinars" },
          ],
        };
      }

      const list = webinars
        .slice(0, 4)
        .map((item) =>
          [item.title, item.name ? `by ${item.name}` : "", item.date, item.time]
            .filter(Boolean)
            .join(" ")
        )
        .join("\n");

      return {
        role: "bot",
        text: `Current webinars available:\n${list}`,
        links: [
          ...(upcomingWebinarsLink
            ? [{ label: upcomingWebinarsLink.name, href: upcomingWebinarsLink.href }]
            : []),
          { label: "Home Webinars", href: "/#webinars" },
        ],
      };
    }

    if (/(learning|training mode|online|classroom|one on one|1 on 1|custom|flexi|trainer|learnova|qubits)/.test(text)) {
      if (!availableLearningOptions.length) {
        return {
          role: "bot",
          text: "I could not load the current learning options right now. Please use the website navigation or contact support for the latest available learning modes.",
          links: [
            { label: "Courses", href: "/#top-courses" },
            ...(getPageLink("Contact") ? [{ label: "Contact", href: getPageLink("Contact")!.href }] : []),
          ],
        };
      }

      const match = availableLearningOptions
        .map((option) => ({
          option,
          score: scoreText(question, `${option.name} ${option.text}`),
        }))
        .sort((a, b) => b.score - a.score)[0];

      if (match && match.score > 1) {
        return {
          role: "bot",
          text: `${match.option.name} is currently available on the website.`,
          links: [{ label: match.option.name, href: match.option.href }],
        };
      }

      return {
        role: "bot",
        text: `Current learning options include ${availableLearningOptions
          .map((item) => item.name)
          .join(", ")}.`,
        links: availableLearningOptions.slice(0, 5).map((item) => ({
          label: item.name,
          href: item.href,
        })),
      };
    }

    if (/(contact|support|phone|email|message|inquiry|help desk)/.test(text)) {
      const contactPage = getPageLink("Contact");

      return {
        role: "bot",
        text: "Use the current Contact page to send an inquiry to the team.",
        links: contactPage ? [{ label: contactPage.name, href: contactPage.href }] : [],
      };
    }

    if (/(about|company|mission|vision|value|story|who are you)/.test(text)) {
      const aboutPage = getPageLink("About");

      return {
        role: "bot",
        text: aboutPage
          ? "Company information is available on the current About page."
          : "I could not confirm a current About page right now. Please use the website navigation for the latest company information.",
        links: aboutPage ? [{ label: aboutPage.name, href: aboutPage.href }] : [],
      };
    }

    if (/(career|job|placement|resume|interview)/.test(text)) {
      const jobPage = getPageLink("Job Assistance");
      const contactPage = getPageLink("Contact");

      return {
        role: "bot",
        text: jobPage
          ? "Current career support information is available on the Job Assistance page."
          : "I could not confirm a current career support page right now. Please contact support for the latest details.",
        links: [
          ...(jobPage ? [{ label: jobPage.name, href: jobPage.href }] : []),
          ...(contactPage ? [{ label: contactPage.name, href: contactPage.href }] : []),
        ],
      };
    }

    if (/(internship|intern)/.test(text)) {
      const internshipPage = getPageLink("Internship Programs");
      const contactPage = getPageLink("Contact");

      return {
        role: "bot",
        text: internshipPage
          ? "Current internship information is available on the Internship Programs page."
          : "I could not confirm a current internship page right now. Please contact support for the latest details.",
        links: [
          ...(internshipPage ? [{ label: internshipPage.name, href: internshipPage.href }] : []),
          ...(contactPage ? [{ label: contactPage.name, href: contactPage.href }] : []),
        ],
      };
    }

    if (/(partner|trusted|client|company|logo)/.test(text)) {
      const partnersPage = getPageLink("Partners");

      return {
        role: "bot",
        text: partnersPage
          ? "Current partner information is available on the Partners page and homepage sections."
          : "Current partner information, when published, is available on the website.",
        links: [
          ...(partnersPage ? [{ label: partnersPage.name, href: partnersPage.href }] : []),
          { label: "Home", href: "/" },
        ],
      };
    }

    if (/(award|accolade|recognition|certificate)/.test(text)) {
      return {
        role: "bot",
        text: "Current awards, recognitions, and certificate information are shown only where they are currently published on the website.",
        links: [{ label: "Home", href: "/" }],
      };
    }

    if (/(testimonial|review|feedback|learner say)/.test(text)) {
      const feedbackPage = getPageLink("Feedback");

      return {
        role: "bot",
        text: "Current testimonials and feedback are shown only where they are currently published on the website.",
        links: [
          { label: "Home", href: "/" },
          ...(feedbackPage ? [{ label: feedbackPage.name, href: feedbackPage.href }] : []),
        ],
      };
    }

    if (/(feature|offering|benefit|why)/.test(text)) {
      return {
        role: "bot",
        text: "Please check the current website sections for active offerings and benefits. I can also show current courses or connect you with support.",
        links: [
          { label: "Courses", href: "/#top-courses" },
          ...(getPageLink("Contact") ? [{ label: "Contact", href: getPageLink("Contact")!.href }] : []),
        ],
      };
    }

    if (/(course|courses|technology|technologies|microsoft|azure|aws|cisco|security|ai|power bi|devops|itil|cissp|ccna)/.test(text)) {
      if (!courses.length) return coursesUnavailableResponse;

      const ranked = courseIndex
        .map((item) => ({
          ...item,
          score: scoreText(question, item.text),
        }))
        .sort((a, b) => b.score - a.score);

      if (ranked[0]?.score > 1) {
        return {
          role: "bot",
          text: formatCourse(ranked[0].course),
          links: [{ label: "Open Course", href: `/courses/${ranked[0].course.slug}` }],
        };
      }

      return {
        role: "bot",
        text: `Current courses include:\n${courses
          .slice(0, 8)
          .map((course) => `- ${course.title}`)
          .join("\n")}`,
        links: courseLinks,
      };
    }

    const pageMatch = availableSitePages
      .map((page) => ({
        page,
        score: scoreText(question, `${page.name} ${page.text}`),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (pageMatch && pageMatch.score > 1) {
      return {
        role: "bot",
        text: `${pageMatch.page.name} is currently available on the website.`,
        links: [{ label: pageMatch.page.name, href: pageMatch.page.href }],
      };
    }

    return {
      role: "bot",
      text: "I can help with current courses, enrollment, materials, learning options, webinars, login, and contact support. Try asking a more specific website question.",
      links: [
        { label: "Courses", href: "/#top-courses" },
        ...(availableLearningOptions[0]
          ? [{ label: "Learning Options", href: availableLearningOptions[0].href }]
          : []),
        ...(getPageLink("Contact") ? [{ label: "Contact", href: getPageLink("Contact")!.href }] : []),
      ],
    };
  };

  const sendMessage = (event?: FormEvent, forcedText?: string) => {
    event?.preventDefault();

    const question = (forcedText || input).trim();
    if (!question) return;

    const reply = getBotResponse(question);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: question },
      reply,
    ]);
    setInput("");
    setOpen(true);
  };

  if (shouldHide) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/30 border border-white/20 flex items-center justify-center transition hover:bg-[#2563eb] ${
          open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        aria-label="Open website assistant"
      >
        <MessageCircle size={25} />
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-[390px] h-[620px] max-h-[calc(100vh-2.5rem)] bg-[#0f172a] text-white border border-white/[0.10] rounded-2xl shadow-2xl shadow-blue-950/20 overflow-hidden flex flex-col">
          <div className="px-4 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center border border-blue-300/20">
                <Bot size={21} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold leading-tight">FinOps Assistant</h3>
                <p className="text-xs text-slate-400 truncate">
                  Website, courses, training, support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition"
                aria-label="Minimize assistant"
              >
                <Minimize2 size={17} />
              </button>
              <button
                onClick={() => {
                  setMessages([messages[0]]);
                  setInput("");
                }}
                className="p-2 rounded-xl hover:bg-white/10 transition"
                aria-label="Clear chat"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-white/10 flex gap-2 overflow-x-auto scrollbar-hide">
            {quickQuestions.map((question) => (
              <button
                key={question}
                onClick={() => sendMessage(undefined, question)}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition"
              >
                {question}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-white/[0.07] border border-white/10 text-slate-100 rounded-bl-md"
                  }`}
                >
                  <p>{msg.text}</p>

                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.links.map((link) => (
                        <a
                          key={`${link.href}-${link.label}`}
                          href={link.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 px-2.5 py-1.5 text-xs font-semibold transition"
                        >
                          {link.label}
                          <ExternalLink size={12} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="p-3 border-t border-white/10 bg-white/[0.03] flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any website detail..."
              className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-400 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="h-11 w-11 rounded-xl bg-blue-500 hover:bg-[#2563eb] transition flex items-center justify-center text-white"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
