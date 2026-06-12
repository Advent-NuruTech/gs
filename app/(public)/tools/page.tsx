"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ExternalLink,
} from "lucide-react";

type ToolCategory =
  | "AI Assistant"
  | "Research"
  | "Development"
  | "Productivity"
  | "Learning"
  | "Academic";

interface Tool {
  name: string;
  description: string;
  url: string;
  category: ToolCategory;
}

const tools: Tool[] = [
  {
    name: "ChatGPT",
    url: "https://chat.openai.com",
    category: "AI Assistant",
    description:
      "AI-powered assistant for explanations, coding, brainstorming, and structured learning.",
  },
  {
    name: "NotebookLM",
    url: "https://notebooklm.google.com",
    category: "Research",
    description:
      "Upload notes and PDFs to generate summaries and source-grounded answers.",
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    category: "AI Assistant",
    description:
      "Advanced long-form reasoning and document analysis for deep academic writing.",
  },
  {
    name: "DeepSeek",
    url: "https://deepseek.com",
    category: "Development",
    description:
      "AI optimized for technical reasoning, coding, and mathematical problem solving.",
  },
  {
    name: "Grok",
    url: "https://grok.x.ai",
    category: "Research",
    description:
      "Real-time AI conversations and trend exploration.",
  },
  {
    name: "Perplexity",
    url: "https://www.perplexity.ai",
    category: "Research",
    description:
      "Citation-backed AI search engine ideal for academic referencing.",
  },
  {
    name: "YouTube",
    url: "https://youtube.com",
    category: "Learning",
    description:
      "Educational video tutorials, coding walkthroughs, and lectures.",
  },
  
 
  {
    name: "GitHub",
    url: "https://github.com",
    category: "Development",
    description:
      "Code hosting, version control, and collaboration platform.",
  },
  {
    name: "Stack Overflow",
    url: "https://stackoverflow.com",
    category: "Development",
    description:
      "Community-driven Q&A for debugging and programming support.",
  },
  {
    name: "Firebase Console",
    url: "https://console.firebase.google.com",
    category: "Development",
    description:
      "Backend services including authentication and database management.",
  },
  {
    name: "Vercel",
    url: "https://vercel.com",
    category: "Development",
    description:
      "Deployment and hosting platform for modern web applications.",
  },
  {
    name: "Notion",
    url: "https://notion.so",
    category: "Productivity",
    description:
      "All-in-one workspace for study planning and knowledge management.",
  },
  {
    name: "Google Docs",
    url: "https://docs.google.com",
    category: "Productivity",
    description:
      "Collaborative writing and document creation.",
  },
  {
    name: "Canva",
    url: "https://canva.com",
    category: "Productivity",
    description:
      "Design presentations, infographics, and academic visuals.",
  },
  {
    name: "Wolfram Alpha",
    url: "https://wolframalpha.com",
    category: "Academic",
    description:
      "Computational engine for solving math and data problems.",
  },
  {
    name: "Grammarly",
    url: "https://grammarly.com",
    category: "Academic",
    description:
      "Writing enhancement and grammar improvement tool.",
  },
  {
    name: "Google Scholar",
    url: "https://scholar.google.com",
    category: "Research",
    description:
      "Search engine for academic papers and scholarly articles.",
  },
  {
    name: "Internet Archive",
    url: "https://archive.org",
    category: "Research",
    description:
      "Access free books, historical materials, and public archives.",
  },
];

const categories: ToolCategory[] = [
  "AI Assistant",
  "Research",
  "Development",
  "Productivity",
  "Learning",
  "Academic",
];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "All">(
    "All"
  );
  const [search, setSearch] = useState("");

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory =
        activeCategory === "All" || tool.category === activeCategory;

      const matchesSearch =
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-16">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
        
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Curated AI, research, and productivity tools designed to empower
            structured digital learning.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setActiveCategory("All")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCategory === "All"
                ? "bg-primary text-white"
                : "bg-muted hover:bg-muted/70"
            }`}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCategory === category
                  ? "bg-primary text-white"
                  : "bg-muted hover:bg-muted/70"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool, index) => (
            <motion.a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group rounded-2xl border bg-background p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold group-hover:text-primary transition">
                  {tool.name}
                </h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="text-sm text-muted-foreground">
                {tool.description}
              </p>

              <div className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {tool.category}
              </div>
            </motion.a>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No tools found.
          </div>
        )}
      </div>
    </main>
  );
}
