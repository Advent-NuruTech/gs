/**
 * Single source of truth for the AdventSkool Handbook.
 *
 * The same content powers three things:
 *   1. the admin-only handbook page at /dashboard/admin/documentation
 *   2. the "Download PDF" print output of that page
 *   3. the plain-text Markdown export used for AI grounding / fine-tuning data
 *
 * Edit the content here only. Never duplicate handbook copy into components.
 */

export type HandbookBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; title?: string; items: string[] }
  | { kind: "numbered"; title?: string; items: string[] }
  | { kind: "definitions"; title?: string; items: Array<{ term: string; description: string }> }
  | {
      kind: "table";
      caption?: string;
      columns: string[];
      rows: string[][];
    }
  | {
      kind: "callout";
      tone: "info" | "success" | "warning";
      title: string;
      text: string;
    };

export interface HandbookSection {
  id: string;
  chapter: string;
  title: string;
  summary: string;
  blocks: HandbookBlock[];
}

export const HANDBOOK_META = {
  product: "AdventSkool",
  title: "The AdventSkool Handbook",
  subtitle: "What the platform is, what it sells, and how creators get paid",
  version: "1.0",
  canonicalUrl: "https://adventskool.co.ke",
  supportEmail: "adventskool@gmail.com",
  transactionalSender: "noreply@adventskool.co.ke",
  builtBy: "Advent NuruTech Services",
  audience:
    "AdventSkool administrators, creators, support agents, and any AI assistant trained to answer questions about the platform.",
} as const;

/** One-line definition reused verbatim in the AI grounding section and the metadata. */
export const HANDBOOK_SHORT_DESCRIPTION =
  "AdventSkool is a Kenya-focused learning platform offering online courses and practical digital products.";

export const HANDBOOK_LONG_DESCRIPTION =
  "AdventSkool is a mobile-first learning management platform and a product of Advent NuruTech, built to make structured, high-quality education accessible to everyone. Students buy online courses and downloadable digital products in Kenyan shillings. Teachers publish courses and products, host live classes, and are paid through Paystack subaccount splits on verified sales. Administrators manage users, catalogue, payments, payouts, and communications from one dashboard.";

/** Facts an assistant must treat as authoritative. Keep numbers exact. */
export const HANDBOOK_FACTS_AT_A_GLANCE: string[][] = [
  ["Official domain", "adventskool.co.ke"],
  ["Support and contact email", "adventskool@gmail.com"],
  ["Transactional email sender", "noreply@adventskool.co.ke"],
  ["Currency", "Kenyan shilling (KES). Every transaction is single-currency."],
  ["Payment processor", "Paystack"],
  ["Product lines", "Online courses, downloadable digital products, bespoke design customization"],
  ["Physical goods", "None. The platform does not sell or ship physical items."],
  ["Roles", "student, teacher (creator), admin"],
  ["Standard platform commission", "10% of the customer payment per eligible course sale"],
  ["Standard processing fee mode", "exclusive — the creator bears Paystack's processing fee"],
  ["Payout rail", "Paystack subaccount split, per verified creator"],
  ["Governing law", "Laws of the Republic of Kenya, courts of Nairobi"],
  ["Built by", "Powered by Advent NuruTech Services"],
];

export const HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    id: "purpose",
    chapter: "1",
    title: "What AdventSkool is for",
    summary:
      "The platform exists to make structured, practical education and professional digital resources reachable from any phone, in Kenya, at a price a Kenyan learner can pay.",
    blocks: [
      {
        kind: "paragraph",
        text: HANDBOOK_LONG_DESCRIPTION,
      },
      {
        kind: "paragraph",
        text: "The public promise is short: \"Learn something. Make something.\" Alongside it sits the line \"Discover practical courses and digital resources made to move your goals forward.\" Every feature is built to support one of three promises shown to visitors: learn at your pace, instant digital access, and made for real progress.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Mission",
        text: "Make meaningful learning simple, structured, and within reach. We believe learning should be guided, not overwhelming.",
      },
      {
        kind: "bullets",
        title: "Four operating values",
        items: [
          "Learner First — every feature is designed around the student: clear milestones, bite-size lessons, and progress you can actually see and feel.",
          "Accessible by Design — mobile-first and lightweight, so learning works on any device, on any connection, anywhere in the world.",
          "Quality Content — structured outlines, rich media, and practical quizzes help teachers deliver courses that genuinely stick.",
          "Trust & Privacy — international data protection standards, with user data treated with the care it deserves.",
        ],
      },
      {
        kind: "paragraph",
        text: "AdventSkool is a product of Advent NuruTech, a technology company building practical, human-centred digital products that solve real problems.",
      },
    ],
  },
  {
    id: "audience",
    chapter: "2",
    title: "Who the platform serves",
    summary:
      "Three audiences share one platform: learners who buy, creators who teach and sell, and administrators who operate it.",
    blocks: [
      {
        kind: "definitions",
        items: [
          {
            term: "Students (learners)",
            description:
              "Browse and enrol in courses, follow guided lessons with progressive unlocks, take quizzes, message their teachers, join live classes, and track progress from first login to completion.",
          },
          {
            term: "Teachers (creators)",
            description:
              "Publish courses with rich outlines, media, and assessments, sell downloadable digital products, schedule and host live classes through Google Calendar and Meet, and receive payments through a verified Paystack subaccount.",
          },
          {
            term: "Administrators",
            description:
              "Manage users and roles, review creator applications, oversee the catalogue, monitor payments and analytics, send announcements and email campaigns, handle reported problems, and administer creator payouts.",
          },
        ],
      },
      {
        kind: "paragraph",
        text: "Guests may browse the catalogue and buy digital products without an account. Buying a course, sending a message, joining a live class, or claiming a purchase in a personal library requires an account.",
      },
    ],
  },
  {
    id: "what-is-sold",
    chapter: "3",
    title: "What is being sold",
    summary:
      "Three product lines. Everything is digital, priced in Kenyan shillings, and delivered instantly or as scheduled live sessions. No physical goods are sold.",
    blocks: [
      {
        kind: "table",
        caption: "Product lines",
        columns: ["Product line", "What the customer gets", "How it is priced", "Delivery"],
        rows: [
          [
            "Online courses",
            "A structured sequence of lessons with written content, images, video links, and quizzes",
            "One course price, paid in full or lesson by lesson",
            "Instantly, lesson by lesson, after payment is confirmed",
          ],
          [
            "Digital products",
            "Downloadable image files or PDF templates such as thumbnails, flyers, workbooks, and guides",
            "A single download price, or free",
            "Instant download or in-browser reading, repeatable from the buyer's library",
          ],
          [
            "Design customization",
            "Bespoke work produced by the seller using a product as the base template",
            "A single customization fee, charged instead of the download price",
            "Fulfilled manually by the seller after payment",
          ],
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "No physical goods",
        text: "AdventSkool has no shipping, stock, weight, or delivery-address system. If a question implies physical delivery, the answer is that the platform is digital-only.",
      },
      {
        kind: "paragraph",
        text: "Supporting services complete the offer: scheduled live classes with attendance tracking, one-to-one messaging between a student and their teacher, course quizzes, platform announcements, transactional email, and SMS confirmations.",
      },
    ],
  },
  {
    id: "courses",
    chapter: "4",
    title: "How courses are structured and priced",
    summary:
      "A course is a priced, ordered list of lessons. Students buy the whole course or unlock lessons one at a time, and their progress is measured against the full course.",
    blocks: [
      {
        kind: "bullets",
        title: "What a course contains",
        items: [
          "Title and category.",
          "An original price and a discounted price. The amount the student pays is the discounted price.",
          "A thumbnail image and a rich-text course outline.",
          "An ordered list of lessons. Each lesson has a title, written content, an optional image, an optional video link, and an optional quiz.",
          "A publish flag. Courses stay hidden from the public catalogue until published.",
        ],
      },
      {
        kind: "definitions",
        items: [
          {
            term: "Full Course",
            description:
              "Buys every lesson the student does not already own. Shown as \"Pay Remaining Balance\" to a student who already holds some lessons.",
          },
          {
            term: "Pay in Installments",
            description:
              "Unlocks exactly one lesson: the next locked one. Offered only when more than one lesson remains locked, so installments are always sequential.",
          },
        ],
      },
      {
        kind: "paragraph",
        text: "The per-lesson price is the course price divided as evenly as possible, with the rounding remainder added to the last lessons so early lessons stay round numbers. A lesson the student already owns can never be charged again.",
      },
      {
        kind: "paragraph",
        text: "Access is granted per lesson, not per course. A student's library shows exactly the lessons they have paid for, and their progress percentage is measured against the lessons in the whole course so a part-course buyer always sees an honest figure. A course is marked completed at 100 percent.",
      },
    ],
  },
  {
    id: "digital-products",
    chapter: "5",
    title: "How digital products work",
    summary:
      "Digital products are image or PDF files sold as downloads or as in-browser reading, or offered as a template the buyer can have customized.",
    blocks: [
      {
        kind: "bullets",
        title: "Product listing",
        items: [
          "Title, optional description, category, and a preview image.",
          "The deliverable file, which is either an image or a PDF. PDFs also record a page count, which drives the free preview.",
          "A download price. Leaving it empty makes the product free.",
          "An optional customization fee, plus a toggle that decides whether buyers may request custom work on this product.",
        ],
      },
      {
        kind: "paragraph",
        text: "A buyer chooses how to take the product: download the full file, or read it online and return to it later from their personal library. Reading online requires an account. A guest who buys without an account still has their purchase matched to their library by the email address they entered at checkout.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Customization is priced separately",
        text: "A customization order is billed the customization fee only. The download price is never added on top of it, and the two are never charged together.",
      },
      {
        kind: "numbered",
        title: "What a customization buyer submits",
        items: [
          "Contact details: full name, email address, phone number, and WhatsApp number.",
          "The exact text that must appear on the design, plus an optional subtitle, preferred colours, preferred style, and any additional instructions.",
          "Up to twelve reference images such as personal photos, logos, or branding assets.",
        ],
      },
      {
        kind: "paragraph",
        text: "Free products skip the payment step entirely: the order is recorded as paid immediately, the download is released, and a customization request goes straight to the seller's team.",
      },
      {
        kind: "table",
        caption: "Digital product categories",
        columns: ["Category"],
        rows: [
          ["Ebooks"],
          ["Business Guides"],
          ["Study Guides"],
          ["Digital Workbooks"],
          ["Printable Resources"],
          ["Professional Templates"],
          ["YouTube Thumbnails"],
          ["Event Posters"],
          ["Church Flyers"],
          ["Business Flyers"],
          ["Social Media Banners"],
          ["Conference Posters"],
          ["Marketing Graphics"],
          ["Certificates"],
          ["Promotional Designs"],
        ],
      },
    ],
  },
  {
    id: "roles",
    chapter: "6",
    title: "Accounts, roles, and sign-in",
    summary:
      "Every account has exactly one role. The role decides which dashboard a person sees and what they are allowed to change.",
    blocks: [
      {
        kind: "table",
        caption: "Roles",
        columns: ["Role", "What it means", "Where it leads"],
        rows: [
          ["student", "A learner buying and studying", "/dashboard/student"],
          ["teacher", "A creator publishing and selling", "/dashboard/teacher"],
          ["admin", "A platform operator", "/dashboard/admin"],
        ],
      },
      {
        kind: "bullets",
        title: "Sign-in methods",
        items: [
          "Continue with Google.",
          "Continue with email and password.",
          "Administrators can switch either method on or off for the public pages from Auth Settings. Existing accounts are unaffected when a method is turned off.",
        ],
      },
      {
        kind: "paragraph",
        text: "New creator registrations additionally collect one required Kenyan WhatsApp number, which is stored as the creator's contact number. It is stored alongside the account phone field so the team can always reach an applicant.",
      },
      {
        kind: "paragraph",
        text: "Suspension is a time-boxed admin action. A suspended person can still sign in, but every authenticated request is refused until the suspension expires, at which point access returns automatically. Administrators can also restore an account early or delete it permanently.",
      },
    ],
  },
  {
    id: "becoming-a-creator",
    chapter: "7",
    title: "How someone becomes a creator",
    summary:
      "There are two routes: register directly as a creator, or apply to teach from an existing student account. Both land in the same admin review queue.",
    blocks: [
      {
        kind: "numbered",
        title: "Route one — register as a creator",
        items: [
          "Open the creator sign-up link.",
          "Provide full name, email address, a Kenyan WhatsApp number, and a password.",
          "Accept the terms and privacy consent.",
          "The account is created immediately with the teacher role and a pending creator status. An administrator is notified in the dashboard notification feed.",
        ],
      },
      {
        kind: "numbered",
        title: "Route two — apply from a student account",
        items: [
          "Use the \"Teach & sell\" link on the public site while signed in as a student.",
          "Submit the creator application, including the WhatsApp number.",
          "The account is upgraded to the teacher role with a pending creator status, and administrators are notified.",
        ],
      },
      {
        kind: "definitions",
        items: [
          {
            term: "none",
            description: "A student account that has never applied to teach.",
          },
          {
            term: "pending",
            description:
              "Submitted and awaiting an administrator's decision. The creator can already build and publish content, but sales are held on the platform.",
          },
          {
            term: "approved",
            description:
              "Accepted. The creator can keep publishing, and verified sales route through their Paystack subaccount.",
          },
          {
            term: "rejected",
            description:
              "Not accepted. The decision is recorded and the applicant is notified, but the account keeps its teacher role and loses content publishing rights.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Pending means pending on money, not on content",
        text: "A pending creator can create and publish courses and digital products straight away. What is gated is payout: until an administrator approves the application, every sale settles to the platform and is recorded on the earnings ledger as owed to the creator.",
      },
      {
        kind: "paragraph",
        text: "Administrators review applications at Creator Applications in the admin dashboard. Each decision notifies the applicant. Administrators can also approve, decline, suspend, restore, or delete any account from the Users page.",
      },
    ],
  },
  {
    id: "creator-tools",
    chapter: "8",
    title: "What a creator can do",
    summary:
      "The creator workspace covers publishing, teaching live, and tracking money — with money detail kept separate from content detail.",
    blocks: [
      {
        kind: "bullets",
        title: "Create and sell",
        items: [
          "Write a course outline, add lessons with rich content, images, video links, and quizzes, and set prices.",
          "Publish or unpublish the course at any time. Publishing makes it visible in the public catalogue and triggers an announcement email to interested subscribers.",
          "Upload digital products as images or PDFs, set a download price or make them free, and optionally offer a customization service.",
          "Handle customization orders and mark them as work in progress, completed, or delivered.",
        ],
      },
      {
        kind: "bullets",
        title: "Teach live",
        items: [
          "Schedule one-off or repeating live classes through Google Calendar, which generate a Google Meet link automatically.",
          "Target a whole course, every learner, all teachers, all students, a custom list of invitees, or a single personal session.",
          "Record attendance automatically: first join, last join, join count, and total minutes attended.",
        ],
      },
      {
        kind: "bullets",
        title: "Engage and support",
        items: [
          "Message any learner enrolled in the creator's own courses.",
          "Read and send announcements from administrators.",
          "Submit payout details and track the earnings ledger.",
          "Report a problem to administrators.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Messaging opens with enrolment",
        text: "A student-teacher conversation is permitted once the student is enrolled in one of that teacher's courses. Enrolment, not payment alone, unlocks the conversation.",
      },
    ],
  },
  {
    id: "money-flow",
    chapter: "9",
    title: "How creators receive their money",
    summary:
      "End to end: the student pays Paystack, AdventSkool records the sale, takes its commission, and routes the creator's share to their verified Paystack subaccount. Paystack then settles to the creator's bank.",
    blocks: [
      {
        kind: "numbered",
        title: "The full money flow",
        items: [
          "The student chooses a plan at checkout — the full course or the next installment. The server recalculates every price; the browser never supplies an amount.",
          "Checkout snapshots the payout terms for that sale: the commission percentage, the fee mode, the platform's share, and whether the sale will be split. Those terms are frozen for the life of the payment.",
          "Checkout opens Paystack and the student completes the payment. A pending payment record is written before the redirect.",
          "The payment is verified with Paystack server-side. A payment is only fulfilled if Paystack reports success and the amount received is at least the expected amount. Fulfilment is idempotent, so a webhook and a redirect arriving together can never double-unlock content.",
          "Lessons unlock, the enrolment is created or updated, and the student is notified in-app and by SMS. Administrators are notified of the sale in-app and by SMS.",
          "An earnings row is written automatically for the creator, containing the gross amount, the commission, the creator's share, and the settlement mode.",
          "If the creator is approved and payout-verified, Paystack moves the creator's share to their subaccount at settlement. If not, the sale settles to the platform and remains recorded as owed to the creator.",
        ],
      },
      {
        kind: "table",
        caption: "What gates a split",
        columns: ["Requirement", "Why it exists"],
        rows: [
          ["Approved creator application", "The platform only routes money to creators it has vetted."],
          ["Registered Paystack subaccount", "Paystack needs a verified destination account to send the share to."],
          ["Payout status verified and ready", "An administrator must confirm the bank details before any money moves."],
          ["Account not suspended", "A suspended creator does not receive split payments."],
          ["Full commission amount charged at checkout", "The exact platform share is sent to Paystack for that sale rather than relying on a percentage."],
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Routed is not settled",
        text: "An earnings row marked \"routed\" means Paystack accepted the split instruction for that sale. It is not proof that money has landed in the creator's bank account. Bank settlement follows Paystack's schedule and must be confirmed in Paystack's settlement reports.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Sales before verification are never transferred automatically",
        text: "Earnings recorded while a creator was unapproved, unverified, or split-disabled settle to the platform only. They are tracked on the ledger but are not moved by the split integration.",
      },
    ],
  },
  {
    id: "commission",
    chapter: "10",
    title: "Commission, fees, and the earnings ledger",
    summary:
      "AdventSkool takes a 10% commission. Under the standard exclusive fee mode the creator also bears Paystack's processing fee. Both are recorded on the payment at the moment of sale.",
    blocks: [
      {
        kind: "definitions",
        items: [
          {
            term: "Gross amount",
            description: "What the customer paid for that sale.",
          },
          {
            term: "Platform commission",
            description: "AdventSkool's share — 10% of the gross amount by default. This is the platform's revenue.",
          },
          {
            term: "Creator share",
            description: "The gross amount minus the platform commission. This figure deliberately excludes the payment processing fee.",
          },
          {
            term: "Provider fee",
            description: "Paystack's transaction processing fee, recorded separately once the payment is verified. Paystack determines the amount.",
          },
          {
            term: "exclusive",
            description:
              "The standard mode. Paystack's processing fee is borne by the creator, on top of AdventSkool's commission.",
          },
          {
            term: "inclusive",
            description:
              "The alternative mode. AdventSkool bears Paystack's processing fee. The customer's checkout amount is unchanged either way.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Worked example",
        text: "A student pays KES 10,000 for a course. AdventSkool's 10% commission is KES 1,000, leaving a creator share of KES 9,000. If Paystack's processing fee for that transaction is KES 150, the creator's true net under the exclusive mode is KES 8,850. Under the inclusive mode the fee is absorbed by AdventSkool and the creator's net is KES 9,000. The amount the student paid does not change between the two modes.",
      },
      {
        kind: "bullets",
        title: "Rules that protect creators and the platform",
        items: [
          "Terms are snapshotted at checkout. Changing the commission rate or fee mode later changes future checkouts only; past sales keep the terms they were bought under.",
          "One earnings row per payment. The ledger cannot be duplicated by a repeated confirmation.",
          "Creators can have an individual rate set by an administrator. A per-creator rate replaces the platform default for that creator's future sales.",
          "Paystack subaccount percentages are kept in step with the AdventSkool rate, so the two never drift. If Paystack rejects a rate update, the local rate is not saved either — the platform never records a rate that Paystack has not accepted.",
          "New subaccounts are created at the creator's effective rate from the start.",
        ],
      },
      {
        kind: "paragraph",
        text: "Historical and platform-only earnings are not moved by the split integration. Any question about paying a creator money that was earned before verification, or while the creator was unapproved, is an operational decision for administrators.",
      },
    ],
  },
  {
    id: "payout-onboarding",
    chapter: "11",
    title: "Creator payout onboarding and verification",
    summary:
      "A creator submits Kenyan bank details once. Paystack converts them into a payout subaccount, and an administrator verifies the account before any split is enabled.",
    blocks: [
      {
        kind: "numbered",
        title: "What the creator submits",
        items: [
          "Account holder name, exactly as it appears at their bank.",
          "Bank, chosen from Paystack's live list of Kenyan banks.",
          "Full account number.",
          "A contact phone number.",
        ],
      },
      {
        kind: "bullets",
        title: "What happens on submission",
        items: [
          "The details are sent server-to-server to Paystack to create a payout subaccount.",
          "The full account number is discarded immediately and never stored by AdventSkool. Only the Paystack subaccount code and the last four digits are kept.",
          "The payout profile is set to pending verification. The creator is told an administrator will review it.",
          "If Paystack registers the account but the local save fails, the creator is told to contact support rather than resubmit, so no duplicate subaccount is created.",
        ],
      },
      {
        kind: "numbered",
        title: "What an administrator does",
        items: [
          "Opens Creator Payouts and reviews each pending profile.",
          "Verifies the account holder name and bank against the creator's own records and any supporting proof.",
          "Marks the profile verified, which also sets the payout status to ready and syncs the effective commission rate to Paystack.",
          "Can also mark the profile rejected, which pauses the payout, or return it to pending.",
          "A profile cannot be verified without a registered Paystack subaccount.",
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "Creator payout agreement — the headline terms",
        text: "AdventSkool's standard platform commission is 10% of the customer payment for each eligible course sale. The remainder, after applicable payment processing fees, is allocated to the creator. The standard fee mode is exclusive, so Paystack's processing fee is borne by the creator and is separate from AdventSkool's commission. Full terms are published on the public Creator Payout Agreement page.",
      },
      {
        kind: "paragraph",
        text: "Special commission rates or fee arrangements can be requested by contacting AdventSkool with the subject \"Creator payout special deal\". A special arrangement only applies once AdventSkool confirms it in writing and the rate is saved to the creator's settings. The agreement is not negotiable by the platform automatically.",
      },
    ],
  },
  {
    id: "settlement",
    chapter: "12",
    title: "Settlement states explained",
    summary:
      "Four terms describe where a creator's money is. They are easy to confuse and must always be used precisely.",
    blocks: [
      {
        kind: "definitions",
        items: [
          {
            term: "pending",
            description:
              "The sale settled to the platform and the creator's share is recorded as owed. No transfer instruction has been issued.",
          },
          {
            term: "routed",
            description:
              "Paystack accepted the split instruction for this sale. The share is queued for Paystack's normal settlement schedule. This does not confirm the money has reached the creator's bank.",
          },
          {
            term: "paid",
            description: "The earnings row is marked as having been paid out.",
          },
          {
            term: "on hold",
            description: "The earnings row is being withheld pending review.",
          },
        ],
      },
      {
        kind: "table",
        caption: "Settlement modes",
        columns: ["Mode", "Meaning"],
        rows: [
          ["paystack_split", "The sale carried a live Paystack split to the creator's subaccount."],
          ["platform_only", "The sale settled to AdventSkool with no transfer instruction."],
          ["legacy", "Recorded before the split integration existed. Never transferred automatically."],
        ],
      },
      {
        kind: "paragraph",
        text: "To answer \"has this creator been paid?\", check the settlement mode and status first, then confirm actual bank settlement in Paystack's settlement reports. The AdventSkool ledger is the record of intent and allocation; Paystack's reports are the record of settlement.",
      },
    ],
  },
  {
    id: "buyer-journey",
    chapter: "13",
    title: "The buying journey",
    summary: "What a customer actually does, from discovery to keeping the product.",
    blocks: [
      {
        kind: "numbered",
        title: "Buying a course",
        items: [
          "Browse or search the public course catalogue and add courses to the cart.",
          "Sign in if not already signed in. Course purchases require an account.",
          "Choose a plan at checkout: the full course or the next installment.",
          "Complete payment on Paystack.",
          "Return to the success page, where the purchase is verified and unlocked. The student also receives in-app and SMS confirmation.",
        ],
      },
      {
        kind: "numbered",
        title: "Buying a digital product",
        items: [
          "Open the product page and choose to download the file or read it online.",
          "Enter name, email address, and phone number. Guests are welcome.",
          "Pay, or continue immediately if the product is free.",
          "Downloads start automatically. Online reading requires an account and opens in the buyer's library.",
        ],
      },
      {
        kind: "numbered",
        title: "Requesting a customization",
        items: [
          "Open the customization form from the product page.",
          "Enter contact details, the exact text required, preferences, and up to twelve reference images.",
          "Pay the customization fee, or continue immediately if it is free.",
          "The seller is notified and begins the custom work.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "If a payment looks stuck",
        text: "A purchase is recorded automatically as soon as Paystack confirms it, even if the customer closed the browser before returning to the success page. The order then appears in the buyer's library.",
      },
    ],
  },
  {
    id: "operations",
    chapter: "14",
    title: "How the platform is operated",
    summary:
      "What administrators actually do day to day, and the systems that notify them automatically.",
    blocks: [
      {
        kind: "bullets",
        title: "Administrator capabilities",
        items: [
          "Create, edit, suspend, restore, and delete user accounts, and change roles.",
          "Review and decide creator applications, and verify or pause creator payout profiles.",
          "Set the platform commission rate, the default fee mode, and per-creator overrides.",
          "Create, publish, unpublish, and edit any course or digital product, including platform-owned listings.",
          "Review every course payment and digital product order, and track fulfilment status.",
          "Send platform announcements and scheduled or immediate email campaigns to all users or to a category.",
          "Read analytics, users, courses, payments, payouts, and reported problems from one dashboard.",
          "Turn Google or email sign-in on or off for the public pages.",
        ],
      },
      {
        kind: "bullets",
        title: "Automatic notifications",
        items: [
          "Every admin is notified in-app and by SMS when a course payment succeeds.",
          "Students are notified in-app and by SMS when a payment succeeds and lessons unlock.",
          "Administrators are notified when a creator registers or submits an application.",
          "Applicants are notified when a decision is made on their application.",
          "Publishing a course queues an announcement email to subscribed users interested in that category.",
          "Email campaigns are queued per recipient and delivered in rate-limited batches.",
        ],
      },
      {
        kind: "bullets",
        title: "Analytics the dashboard reports",
        items: [
          "Users and creators, split by role.",
          "Course and product counts, publication status, and popularity.",
          "Payments taken and earnings owed to creators.",
          "Learner progress and live class attendance.",
        ],
      },
    ],
  },
  {
    id: "data",
    chapter: "15",
    title: "What the platform stores",
    summary:
      "A plain-language map of the data, so support and AI answers never promise storage that does not exist.",
    blocks: [
      {
        kind: "table",
        caption: "Core data",
        columns: ["Data", "What it holds"],
        rows: [
          ["Accounts", "Identity, contact details, role, creator status, WhatsApp number, marketing consent, suspension state."],
          ["Courses and lessons", "Outlines, lesson content, media links, quizzes, prices, publication status, lesson counts."],
          ["Enrolments", "Unlocked lessons, completed lessons, progress percentage, total study minutes, status."],
          ["Payments", "Amount, currency, plan type, lessons covered, Paystack reference, status, and the payout terms snapshotted at checkout."],
          ["Digital product orders", "Buyer contact details, customization brief, uploaded reference images, amount, payment and fulfilment status."],
          ["Creator payouts", "Account holder name, bank name and code, last four digits only, Paystack subaccount code, verification and payout status."],
          ["Creator earnings", "Gross amount, commission percentage, platform commission, creator share, provider fee, settlement mode and status."],
          ["Messaging", "One-to-one student-teacher conversations between enrolled pairs."],
          ["Live classes", "Schedule, recurrence, Meet link, invitees, and attendance."],
          ["Communications", "Notifications, announcements, read state, and queued email campaigns."],
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "What is never stored",
        text: "AdventSkool does not store full card numbers, CVVs, or full bank account numbers. Card details are handled entirely by Paystack. Full bank account numbers are sent to Paystack for subaccount registration and then discarded.",
      },
    ],
  },
  {
    id: "policies",
    chapter: "16",
    title: "Policies that apply to everyone",
    summary: "The legal and trust baseline, summarised. The full published policies govern.",
    blocks: [
      {
        kind: "bullets",
        title: "Terms of service",
        items: [
          "Governed by the laws of the Republic of Kenya, with the courts of Nairobi having jurisdiction.",
          "Users must be 18 or older, or 13 to 17 with guardian consent. The service is not directed at children under 13.",
          "Course and product access is a personal, non-exclusive, non-transferable, revocable licence for personal, non-commercial educational use. Reselling and derivative redistribution are not permitted.",
          "Prices are displayed in the currency shown at checkout, which in practice is always Kenyan shillings.",
          "Liability is capped at the amount paid in the twelve months preceding the event.",
        ],
      },
      {
        kind: "bullets",
        title: "Privacy and data protection",
        items: [
          "AdventSkool claims alignment with the GDPR, the UK GDPR, the CCPA and CPRA, and the Kenya Data Protection Act 2019.",
          "Card and bank details are never stored. Payment processing is attributed to the payment processor's own compliance.",
          "Google account data is handled under the Google API Services User Data Policy, including its Limited Use requirements. Google user data is not used for advertising and is not sold.",
          "Data is kept while an account is active, then only where needed for legal obligations, disputes, fraud prevention, or enforcement.",
          "Data subject rights, including access, correction, deletion, and portability, can be exercised by contacting support.",
        ],
      },
      {
        kind: "bullets",
        title: "Creator responsibilities",
        items: [
          "Provide accurate account and contact information.",
          "Keep published content lawful and accurate, and keep sales claims truthful.",
          "Handle any taxes or other obligations that apply to their own earnings.",
        ],
      },
    ],
  },
  {
    id: "faq",
    chapter: "17",
    title: "Frequently asked questions",
    summary: "Approved answers. Use these rather than improvising.",
    blocks: [
      {
        kind: "definitions",
        items: [
          {
            term: "How much does AdventSkool charge creators?",
            description:
              "AdventSkool's standard platform commission is 10% of the customer payment for each eligible course sale. A creator-specific rate may be set for individual creators and replaces the standard rate for their future sales.",
          },
          {
            term: "Who pays Paystack's processing fee?",
            description:
              "Under the standard exclusive mode, the creator bears Paystack's processing fee separately from AdventSkool's 10% commission. Under the inclusive mode, AdventSkool bears it. The customer's checkout amount is the same either way.",
          },
          {
            term: "How long does a creator wait to be paid?",
            description:
              "AdventSkool routes the creator's share as part of the sale. Paystack's settlement schedule then determines when the money reaches the creator's bank. AdventSkool does not promise a specific number of days.",
          },
          {
            term: "A creator says they were not paid. What should I check?",
            description:
              "Check the earnings row's settlement mode and status first. A status of routed means Paystack accepted the split, not that the bank has settled. Then confirm in Paystack's settlement reports.",
          },
          {
            term: "Does a creator need to be approved before they can teach?",
            description:
              "No. A pending creator can publish courses and products immediately. Approval is what enables routed payouts. Sales before approval settle to the platform and stay recorded as owed.",
          },
          {
            term: "Can a creator set their own commission or take payment outside the platform?",
            description:
              "No. Creator sales run through AdventSkool checkout so the ledger stays accurate. A special arrangement is possible only after AdventSkool confirms it in writing and the rate is saved to the creator's settings.",
          },
          {
            term: "Can I buy a product without an account?",
            description:
              "Yes, for downloads and customization requests. Reading a product online, buying a course, and building a permanent library all require an account.",
          },
          {
            term: "My payment left my account but nothing unlocked.",
            description:
              "Access is granted as soon as Paystack confirms the payment, which normally happens within seconds. If it still has not appeared, ask the buyer for their email address and the Paystack reference, then check the payments list.",
          },
          {
            term: "Do you ship physical products?",
            description: "No. Every product on AdventSkool is digital and delivered instantly or as a scheduled live class.",
          },
          {
            term: "What currency is charged in?",
            description: "Kenyan shillings, for every transaction.",
          },
          {
            term: "How do I get a course or product removed?",
            description:
              "Open the product page and use the Report a Problem control, or email support. Administrators review every report.",
          },
          {
            term: "What is the support email?",
            description: "adventskool@gmail.com. For a special payout deal, use the subject line \"Creator payout special deal\".",
          },
        ],
      },
    ],
  },
  {
    id: "ai-training",
    chapter: "18",
    title: "Training an AI assistant about AdventSkool",
    summary:
      "Use this section as the grounding brief. It gives the description, the authoritative facts, the glossary, the approved answers, and the claims that must never be invented.",
    blocks: [
      {
        kind: "paragraph",
        text: "The fastest way to make an assistant accurate about AdventSkool is to give it this handbook as retrieval context rather than expecting it to recall the platform. The structured content below is the minimum grounding set; the chapters above supply the detail.",
      },
      {
        kind: "definitions",
        items: [
          {
            term: "Short description (use when a length limit applies)",
            description: HANDBOOK_SHORT_DESCRIPTION,
          },
          {
            term: "Long description (default)",
            description: HANDBOOK_LONG_DESCRIPTION,
          },
          {
            term: "Tagline",
            description: "\"Learn something. Make something.\"",
          },
          {
            term: "Positioning line",
            description:
              "\"Discover practical courses and digital resources made to move your goals forward.\"",
          },
        ],
      },
      {
        kind: "table",
        caption: "Authoritative facts",
        columns: ["Fact", "Value"],
        rows: HANDBOOK_FACTS_AT_A_GLANCE,
      },
      {
        kind: "definitions",
        title: "Glossary",
        items: [
          {
            term: "Creator",
            description: "Any account with the teacher role. A creator may be pending, approved, or rejected as an applicant.",
          },
          {
            term: "Commission",
            description:
              "AdventSkool's share of a sale. Standard is 10%. Distinct from Paystack's processing fee.",
          },
          {
            term: "Exclusive / inclusive fee mode",
            description:
              "Exclusive (standard): the creator bears Paystack's processing fee. Inclusive: AdventSkool bears it.",
          },
          {
            term: "Split",
            description:
              "The instruction sent to Paystack to route a creator's share to their subaccount at settlement.",
          },
          {
            term: "Subaccount",
            description:
              "A Paystack payout destination registered against a creator's bank details. The subaccount code is server-only and is never exposed to the browser.",
          },
          {
            term: "Routed",
            description:
              "Paystack accepted the split for that sale. Not proof of bank settlement.",
          },
          {
            term: "Platform-only sale",
            description:
              "A sale that settled to AdventSkool with no split, because the creator was unapproved, unverified, or paused.",
          },
          {
            term: "Snapshot",
            description:
              "The commission percentage, fee mode, platform share, and settlement mode frozen onto a payment at checkout. Later settings changes never alter past sales.",
          },
          {
            term: "Lesson unlock",
            description:
              "The authoritative per-lesson access record. Access follows unlocks, not the enrolment alone.",
          },
          {
            term: "Installment",
            description: "A payment that unlocks exactly one lesson: the next locked lesson in order.",
          },
          {
            term: "Customization order",
            description:
              "A request for bespoke work based on a digital product. Priced at the customization fee only.",
          },
          {
            term: "Earnings ledger",
            description:
              "One row per eligible payment holding gross, commission, creator share, provider fee, and settlement state.",
          },
        ],
      },
      {
        kind: "bullets",
        title: "Answering rules for the assistant",
        items: [
          "State Kenyan shillings as the currency and Paystack as the processor. Never name another processor.",
          "Never quote a payout time in days. Settlement follows Paystack's schedule and must be confirmed in Paystack's settlement reports.",
          "Never describe a routed earnings row as money in the creator's bank.",
          "Never state or imply a course rating, review score, learner count, or testimonial. AdventSkool does not operate a public ratings system, and any such figure is fabricated.",
          "Never invent courses, products, prices, discounts, or creators. Point the user to the live catalogue.",
          "Never promise that historical or platform-only earnings will be transferred automatically.",
          "Route anything about a special commission rate, a refund, or a missing payment to adventskool@gmail.com and say it needs a human administrator.",
          "Keep answers short, plain, and second person. AdventSkool's voice is progress-framed and never boastful.",
        ],
      },
      {
        kind: "bullets",
        title: "Grounding tasks to test the assistant",
        items: [
          "\"What does AdventSkool sell?\" — must return courses, digital products, and design customization, digital only, in KES.",
          "\"How much does a creator keep?\" — must return 10% commission to AdventSkool and, under the standard mode, Paystack's fee borne by the creator.",
          "\"A creator says they were paid. How do I confirm it?\" — must separate routed from settled and point to Paystack settlement reports.",
          "\"Can a teacher publish before approval?\" — must answer yes, and explain that approval gates payouts, not publishing.",
          "\"Does AdventSkool ship anything?\" — must answer no.",
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "Keeping the assistant current",
        text: "This handbook is the source of truth. When commissions, fee modes, product lines, or policies change, update the relevant chapter here first, then re-export the Markdown file so the assistant's grounding data matches the live platform.",
      },
    ],
  },
];

/** Renders the handbook to Markdown for AI grounding data or offline reading. */
export function handbookToMarkdown(): string {
  const lines: string[] = [];

  lines.push(`# ${HANDBOOK_META.title}`);
  lines.push("");
  lines.push(`**${HANDBOOK_META.subtitle}**`);
  lines.push("");
  lines.push(`- Canonical site: ${HANDBOOK_META.canonicalUrl}`);
  lines.push(`- Support email: ${HANDBOOK_META.supportEmail}`);
  lines.push(`- Transactional sender: ${HANDBOOK_META.transactionalSender}`);
  lines.push(`- Built by: ${HANDBOOK_META.builtBy}`);
  lines.push(`- Handbook version: ${HANDBOOK_META.version}`);
  lines.push(`- Intended audience: ${HANDBOOK_META.audience}`);
  lines.push("");

  lines.push("## Facts at a glance");
  lines.push("");
  lines.push("| Fact | Value |");
  lines.push("| --- | --- |");
  for (const row of HANDBOOK_FACTS_AT_A_GLANCE) {
    lines.push(`| ${row[0]} | ${row[1]} |`);
  }
  lines.push("");

  for (const section of HANDBOOK_SECTIONS) {
    lines.push(`## Chapter ${section.chapter}. ${section.title}`);
    lines.push("");
    lines.push(`> ${section.summary}`);
    lines.push("");

    for (const block of section.blocks) {
      switch (block.kind) {
        case "paragraph":
          lines.push(block.text);
          lines.push("");
          break;
        case "bullets":
          if (block.title) {
            lines.push(`**${block.title}**`);
            lines.push("");
          }
          for (const item of block.items) lines.push(`- ${item}`);
          lines.push("");
          break;
        case "numbered":
          if (block.title) {
            lines.push(`**${block.title}**`);
            lines.push("");
          }
          block.items.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
          lines.push("");
          break;
        case "definitions":
          if (block.title) {
            lines.push(`**${block.title}**`);
            lines.push("");
          }
          for (const item of block.items) {
            lines.push(`- **${item.term}** — ${item.description}`);
          }
          lines.push("");
          break;
        case "table":
          if (block.caption) {
            lines.push(`**${block.caption}**`);
            lines.push("");
          }
          lines.push(`| ${block.columns.join(" | ")} |`);
          lines.push(`| ${block.columns.map(() => "---").join(" | ")} |`);
          for (const row of block.rows) lines.push(`| ${row.join(" | ")} |`);
          lines.push("");
          break;
        case "callout":
          lines.push(`> **${block.title}**`);
          lines.push(">");
          lines.push(`> ${block.text}`);
          lines.push("");
          break;
      }
    }
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export const HANDBOOK_MARKDOWN_FILENAME = "adventskool-handbook.md";
