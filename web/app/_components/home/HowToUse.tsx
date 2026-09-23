import { ServiceList } from "../ui/Services";

const steps = [
  {
    index: "01",
    title: "Students",
    expandedBullets: true,
    bullets: [
      "See general and class-targeted announcements",
      "Browse and search the event gallery",
      "Upload photos and videos for review",
      "Track your upload status and rejection reasons",
    ],
  },
  {
    index: "02",
    title: "Teachers",
    expandedBullets: true,
    bullets: [
      "Everything students can do",
      "Create general or class-targeted announcements",
      "Attach images to announcements",
      "Target specific sections, courses, or students",
    ],
  },
  {
    index: "03",
    title: "Admins",
    expandedBullets: true,
    bullets: [
      "Review and approve pending uploads",
      "Manage users and their roles",
      "Organize gallery categories",
      "View a complete audit log",
    ],
  },
];

export default function HowToUse() {
  return (
    <section
      id="how-to-use"
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="tokens-container tokens-section">
        <ServiceList
          eyebrow="How it works"
          title="Built for students, teachers, and admins."
          description="One hub with role-aware access. Everyone sees exactly what they need — nothing more, nothing less."
          items={steps}
        />
      </div>
    </section>
  );
}
