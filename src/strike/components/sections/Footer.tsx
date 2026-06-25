import Image from "next/image";
import Link from "next/link";
import { FOOTER, SITE_NAME } from "@/lib/constants";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  X: (
    <svg width="18" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Facebook: (
    <svg width="12" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  Discord: (
    <svg width="20" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.916 12.916 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.165 12.165 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
};

export function Footer() {
  return (
    <footer
      className="relative px-3 py-12 cv-auto md:p-12"
      aria-label="Site footer"
    >
      <div className="mx-auto flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="flex w-full items-center justify-between md:contents">
          <Link
            href="/"
            className="flex h-8 w-[84px] shrink-0 justify-start md:order-1 md:w-[320px]"
            aria-label={SITE_NAME}
          >
            <Image
              src="/Logo.png"
              alt=""
              width={84}
              height={32}
              className="object-contain"
            />
          </Link>

          <div
            className="flex items-center justify-end gap-3 md:order-3 md:w-[320px]"
            role="list"
            aria-label="Social links"
          >
            {FOOTER.socials.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                role="listitem"
                className="flex size-9 items-center justify-center rounded-[12px] bg-black/[0.06] text-[#3e424d] transition-[background-color,opacity] duration-200 hover:bg-black/[0.1] md:rounded-full md:bg-black/55 md:text-white/90 md:hover:bg-black/70 md:hover:text-white"
              >
                {SOCIAL_ICONS[label] ?? <span className="text-xs">{label[0]}</span>}
              </Link>
            ))}
          </div>
        </div>

        <p className="max-w-xs text-center text-[12px] leading-normal tracking-[-0.24px] text-[#3e424d]/70 md:order-2 md:flex-1 md:text-sm md:leading-snug md:tracking-normal md:text-black/50">
          {FOOTER.copyright}
        </p>
      </div>
    </footer>
  );
}
