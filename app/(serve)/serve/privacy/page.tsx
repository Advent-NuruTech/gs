import type { Metadata } from "next";
import ServeLegalPage from "@/components/serve/ServeLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | SERVE* If Saved",
  description: "How SERVE* If Saved collects and handles information when you apply to join.",
};

const sections = [
  {
    title: "1. Who is responsible",
    content:
      "This notice explains how information is handled when you use SERVE* If Saved. The SERVE* If Saved programme team is responsible for administering the programme and its applications. For questions or requests about your information, email ifsavedserve@gmail.com or call +254 142 225 233.",
  },
  {
    title: "2. Information collected",
    content:
      "When you submit a SERVE application, we collect the details requested on the form: your name, email address, phone number, country, town or city, and, if you choose to provide them, your church or fellowship and what you would like to learn. We also receive basic technical information needed to deliver and protect the website, such as request and device information handled by our hosting and security services.",
  },
  {
    title: "3. How information is used",
    content:
      "Application details are used to review your application, contact you about the programme, administer participation, and maintain programme records. Technical information is used to deliver, secure, troubleshoot, and maintain the website. We do not sell applicant personal information.",
  },
  {
    title: "4. Sharing and service providers",
    content:
      "Access to application details is limited to authorised people who administer or review the programme. We may use hosting, database, and security providers to operate the website; those providers process information as needed to provide their services. We may also disclose information where required by law or where reasonably necessary to protect rights, safety, and the service. External websites and services have separate data practices described in their own notices.",
  },
  {
    title: "5. Retention and security",
    content:
      "We keep application information for as long as it is needed to review and administer applications, communicate with applicants, maintain appropriate programme records, and meet legal or security requirements. We use reasonable safeguards designed to protect information, but no internet transmission or storage method can be guaranteed completely secure.",
  },
  {
    title: "6. Your choices and rights",
    content:
      "Under the Kenya Data Protection Act, 2019 and other applicable laws, you may have the right to access or correct your personal information, request deletion, or object to or restrict certain processing. Email ifsavedserve@gmail.com or call +254 142 225 233 to make a request. We may need to verify your identity and may retain information where the law requires or permits it. You may also raise a concern with the Office of the Data Protection Commissioner in Kenya. You may choose not to provide optional application details; required fields are needed to process an application.",
  },
  {
    title: "7. Children and international use",
    content:
      "The programme website is available to a general audience. If you are a minor, please involve a parent or guardian before submitting personal information. The website and its service providers may process information in countries other than the country where you are located; where required, appropriate safeguards will be used for such transfers.",
  },
  {
    title: "8. Updates",
    content:
      "We may update this notice when our practices or legal requirements change. The revised date will be shown at the top of this page. For privacy questions or requests, email ifsavedserve@gmail.com.",
  },
];

export default function ServePrivacyPage() {
  return (
    <ServeLegalPage
      title="Privacy Policy"
      intro="This notice describes the information SERVE* If Saved handles when you visit the website or submit a programme application."
      sections={sections}
    />
  );
}
