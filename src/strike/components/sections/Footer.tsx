import Image from "next/image";
import Link from "next/link";
import { FOOTER, SITE_NAME } from "@/lib/constants";
import { BRAND_SOCIAL_ICONS } from "@/lib/socialLinks";

const SOCIAL_ICONS = BRAND_SOCIAL_ICONS;

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
            className="flex h-8 w-[100px] shrink-0 justify-start md:order-1 md:w-[320px]"
            aria-label={SITE_NAME}
          >
            <Image
              src="/logo-vertical-black.png"
              alt=""
              width={1024}
              height={418}
              className="h-8 w-auto object-contain"
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
