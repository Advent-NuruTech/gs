import Image from "next/image";
import Link from "next/link";

export default function AuthLogo() {
  return (
    <Link href="/" className="inline-block" aria-label="AdventSkool home">
      <Image src="/brand/adventskool-wordmark.png" alt="AdventSkool" width={240} height={70} className="h-auto w-52 max-w-full" priority />
    </Link>
  );
}
