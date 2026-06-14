import Image from "next/image";
import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  /** Controls the form pane background: light for student pages, dark for admin. */
  variant?: "light" | "dark";
}

/**
 * Two-pane auth chrome. The `logincover.jpg` lives in a sticky pane on the left
 * (full height, full quality, no scrim) while the form sits in a scrollable
 * pane on the right. On mobile the image pane is hidden and the form fills the
 * screen on a subtle gradient.
 */
export default function AuthShell({ children, variant = "light" }: AuthShellProps) {
  const formPane =
    variant === "dark"
      ? "bg-slate-950"
      : "bg-gradient-to-br from-indigo-50 via-white to-purple-50";

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left image pane — sticky, vertically centered, shown uncropped at full quality */}
      <div className="relative hidden lg:block">
        <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
          <Image
            src="/images/logincover.jpg"
            alt="A student learning online"
            width={1430}
            height={1100}
            priority
            quality={100}
            sizes="50vw"
            className="h-auto max-h-full w-full object-contain"
          />
        </div>
      </div>

      {/* Right form pane */}
      <div className={`flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-12 ${formPane}`}>
        {children}
      </div>
    </div>
  );
}
