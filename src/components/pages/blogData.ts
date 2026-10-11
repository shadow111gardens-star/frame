// Shared blog post data for Blog list and BlogPost detail

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: "Design" | "Engineering" | "AI" | "Industry" | "Interviews";
  readTime: string;
  date: string;
  author: string;
  featured?: boolean;
}

export const POSTS: BlogPost[] = [
  {
    slug: "design-systems-and-ai",
    title: "Why design systems still matter in the age of AI",
    excerpt:
      "Generative models are great at producing pixels. They're terrible at producing consistent pixels across 200 screens. Here's why the design system renaissance is just beginning.",
    category: "Design",
    readTime: "8 min read",
    date: "May 4, 2026",
    author: "Sofia Reyes",
    featured: true,
  },
  {
    slug: "from-figma-to-react-native",
    title: "From Figma to React Native: the missing automation layer",
    excerpt:
      "We've spent five years teaching computers to translate designs into code. Here's what actually works in 2026, and what we got wrong along the way.",
    category: "Engineering",
    readTime: "12 min read",
    date: "Apr 22, 2026",
    author: "Aarav Patel",
  },
  {
    slug: "interview-stripe-design",
    title: "How Stripe's design team ships mobile in 4 days",
    excerpt:
      "We sat down with four designers at Stripe to understand how a team of 30 keeps a $90B app feeling cohesive across 11 product surfaces.",
    category: "Interviews",
    readTime: "15 min read",
    date: "Apr 9, 2026",
    author: "Mira Chen",
  },
  {
    slug: "the-economics-of-mobile",
    title: "The economics of mobile in 2026: a developer's survival guide",
    excerpt:
      "App Store fees, cross-platform costs, accessibility audits, and the real cost of building for both platforms. The numbers will surprise you.",
    category: "Industry",
    readTime: "10 min read",
    date: "Mar 28, 2026",
    author: "Daniel Okafor",
  },
  {
    slug: "dark-mode-design",
    title: "Dark mode is not a color, it's a discipline",
    excerpt:
      "Every team ships dark mode eventually. Almost none of them ship it well. Here's the design system we use internally for FRAME and the 47 things we got wrong before we got it right.",
    category: "Design",
    readTime: "7 min read",
    date: "Mar 14, 2026",
    author: "Sofia Reyes",
  },
  {
    slug: "small-teams-ship-fast",
    title: "Why the best product teams in 2026 are under 12 people",
    excerpt:
      "We surveyed 200 design and engineering teams. The data on team size, shipping velocity, and product quality is more interesting than you think.",
    category: "Industry",
    readTime: "9 min read",
    date: "Mar 2, 2026",
    author: "Daniel Okafor",
  },
  {
    slug: "research-with-appllama",
    title: "How we use Appllama to research mobile patterns at scale",
    excerpt:
      "A behind-the-scenes look at the research pipeline that powers FRAME's AI — and the design lessons we learned from analyzing 50,000 mobile screens.",
    category: "AI",
    readTime: "11 min read",
    date: "Feb 18, 2026",
    author: "Jonas Lindqvist",
  },
  {
    slug: "principles-of-restraint",
    title: "The principles of restraint: how we designed FRAME",
    excerpt:
      "We removed 80% of what our v1 could do, and the product got better. Here's the philosophy behind every interface decision in our workspace.",
    category: "Design",
    readTime: "6 min read",
    date: "Feb 4, 2026",
    author: "Mira Chen",
  },
];

export const CATEGORIES = ["All", "Design", "Engineering", "AI", "Industry", "Interviews"];
