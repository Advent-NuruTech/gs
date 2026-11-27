import type { Metadata } from "next";
import ServeLegalPage from "@/components/serve/ServeLegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | SERVE* If Saved",
  description: "Terms governing use of the SERVE* If Saved website and learning programme.",
};

const sections = [
  {
    title: "1. About these terms",
    content:
      "These terms apply when you visit or use the SERVE* If Saved website, apply to join its Bible-study programme, or access its timetable and learning information. By using these pages or submitting an application, you agree to these terms. If you do not agree, please do not use the website or submit an application.",
  },
  {
    title: "2. The programme and applications",
    content:
      "SERVE* If Saved provides Bible-study and Christian learning materials, including a planned series of studies and related timetable information. Submitting the registration form is an application, not confirmation of acceptance or a guarantee of a place. We may contact applicants using the details they provide to discuss next steps. Learning materials are for general educational and religious purposes and do not guarantee any particular spiritual, personal, or other outcome.",
  },
  {
    title: "3. Your information and acceptable use",
    content:
      "Please provide information that is accurate and keep communications respectful. You must not misuse the website, interfere with its operation, attempt unauthorised access, or submit unlawful, misleading, abusive, or infringing material. We may restrict access or decline to process an application where reasonably necessary to protect people, the programme, or the service.",
  },
  {
    title: "4. Learning materials and intellectual property",
    content:
      "Unless stated otherwise, materials published specifically for SERVE* If Saved are owned by their respective rights holders. You may use them for your own personal study. You may not republish, sell, modify, or distribute them without permission from the rights holder, except where applicable law allows. Bible translations and linked materials may belong to third parties and remain subject to their terms.",
  },
  {
    title: "5. Other websites and AdventSkool resources",
    content:
      "The SERVE website may link to third-party services or to AdventSkool courses and digital resources. Those services have their own terms, privacy notices, availability, and payment conditions. A purchase or account on AdventSkool is not governed by these SERVE terms; review the terms shown on the relevant AdventSkool service before using it.",
  },
  {
    title: "6. Availability and changes",
    content:
      "We aim to keep the website and programme information useful and current, but access may occasionally be interrupted and schedules or content may change. We may update these terms by posting a revised version here. The updated date at the top indicates when this page was last revised.",
  },
  {
    title: "7. Disclaimers and liability",
    content:
      "The website and its content are provided on an “as available” basis. To the extent permitted by law, we do not warrant uninterrupted access or that every item of information will always be complete or error-free. Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for fraud or for death or personal injury caused by negligence. Any other liability is limited to the extent permitted by applicable law.",
  },
  {
    title: "8. Governing law and contact",
    content:
      "These terms are governed by the laws of Kenya, subject to any mandatory protections that apply where you live. For questions about these terms or the SERVE programme, contact adventskool@gmail.com or call +254 142 225 233.",
  },
];

export default function ServeTermsPage() {
  return (
    <ServeLegalPage
      title="Terms & Conditions"
      intro="Please read these terms before using SERVE* If Saved or applying to join its learning programme."
      sections={sections}
    />
  );
}
