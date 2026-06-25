
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence, useScroll, useTransform, useSpring, useMotionTemplate } from "framer-motion";
import { ChevronDown, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CTA, NAV_CTA_HREF, NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { navigateApp } from "@/lib/navigate";
import { PillButtonCta } from "@/components/ui/PillButton";
import { StarBorderLayer } from "@/components/ui/StarBorder";
import { GlassPill, METALLIC_BORDER_BG, PILL_BAR_BG, PILL_BAR_SHADOW, GPU_LAYER } from "@/components/ui/GlassPill";
import { MenuIcon } from "@/components/ui/MenuIcon";

const PRODUCT_LINKS = [
  {
    label: "SR Platform",
    description: "Generates physics-valid simulation environments, produce 3D assets",
    href: "/",
  },
  {
    label: "SR Agentic",
    description: "Builds task-shaped spatial understanding on the fly — and adapts instantly",
    href: "/agentic",
  },
];

function ProductCubeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g filter="url(#navbarProductShadow)">
        <path
          d="M5.83213 37.0418C4.17926 36.0088 4.53237 33.5059 6.40651 32.9704L24.0252 27.9365C25.9511 27.3863 28.017 27.6292 29.7626 28.6111L42.0318 35.5125C43.7332 36.4696 43.4921 38.9908 41.6402 39.6081L24.3161 45.3828C22.1938 46.0902 19.8665 45.8133 17.9694 44.6277L5.83213 37.0418Z"
          fill="url(#navbarProductGround)"
        />
        <path
          d="M24.3132 28.9458C25.9694 28.4726 27.7466 28.6815 29.2478 29.5259L41.5173 36.4272C42.4246 36.9377 42.2958 38.2825 41.3083 38.6118L23.9841 44.3862C22.1589 44.9946 20.1576 44.7565 18.5261 43.7368L6.38843 36.1519C5.5069 35.6009 5.69552 34.2656 6.69507 33.98L24.3132 28.9458Z"
          stroke="url(#navbarProductGroundStroke)"
          strokeWidth="2.1"
        />
      </g>
      <path
        d="M40.497 11.188L40.4062 11.0817L27.4917 3.78833L7.5 10.0803L7.50248 29.3887L7.59383 29.4949L20.5078 36.7883L40.5 30.4963L40.497 11.188ZM28.1143 7.91235L34.7567 11.6936L28.1143 13.7568V7.91235ZM19.0428 32.173L12.2514 28.3672L19.0428 26.2306V32.173ZM10.7646 27.0653V14.1006L19.0189 18.7651L19.0463 24.4817L10.7646 27.0653ZM13.6062 11.9478C13.4871 11.8775 13.3243 11.8037 13.2433 11.6945L26.4785 7.51937V14.2968L20.8722 16.0399C18.4734 14.6401 15.9981 13.3589 13.6062 11.9478ZM26.4785 17.7347V22.1543L22.364 23.4311V19.0115L26.4785 17.7347ZM22.364 32.7622V25.1501L27.2351 23.6367L35.7967 28.5142L22.364 32.7622ZM37.2349 27.4091L28.1396 22.2522L28.1113 17.2242L37.2349 14.346V27.4091Z"
        fill="url(#navbarProductCube)"
      />
      <defs>
        <filter
          id="navbarProductShadow"
          x="3.27393"
          y="26.1479"
          width="41.405"
          height="21.1198"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="0" stdDeviation="0.75" floodOpacity="0.3" />
        </filter>
        <radialGradient
          id="navbarProductGround"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20.9649 38.0022) rotate(90) scale(7.2837 18.2092)"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#CCCCCC" />
        </radialGradient>
        <linearGradient
          id="navbarProductGroundStroke"
          x1="26.6843"
          y1="31.1743"
          x2="23.8604"
          y2="47.5862"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DDDDDD" stopOpacity="0.3" />
          <stop offset="0.360553" stopColor="white" />
          <stop offset="1" stopColor="#DDDDDD" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient
          id="navbarProductCube"
          x1="24"
          y1="3.78833"
          x2="24"
          y2="36.7883"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2D2C39" />
          <stop offset="1" stopColor="#486466" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProductAgenticIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g filter="url(#filter0_d_1040_1507)">
        <path
          d="M5.83238 37.0419C4.17951 36.0089 4.53261 33.506 6.40676 32.9705L24.0255 27.9366C25.9513 27.3863 28.0172 27.6292 29.7629 28.6112L42.032 35.5126C43.7334 36.4696 43.4924 38.9909 41.6404 39.6082L24.3164 45.3829C22.1941 46.0903 19.8667 45.8134 17.9697 44.6277L5.83238 37.0419Z"
          fill="url(#paint0_radial_1040_1507)"
        />
        <path
          d="M24.3135 28.9459C25.9696 28.4727 27.7468 28.6816 29.248 29.5259L41.5176 36.4273C42.4248 36.9377 42.2961 38.2825 41.3086 38.6119L23.9844 44.3863C22.1592 44.9947 20.1578 44.7566 18.5264 43.7369L6.38867 36.1519C5.50715 35.601 5.69576 34.2656 6.69531 33.98L24.3135 28.9459Z"
          stroke="url(#paint1_linear_1040_1507)"
          strokeWidth="2.1"
        />
      </g>
      <path
        d="M21.2949 5.7358C22.3603 4.17437 25.6032 -0.576661 29.3125 1.16549C30.8204 1.87398 31.5849 3.70836 31.585 6.61764C31.585 8.00196 31.4163 9.5767 31.0693 11.4282C30.8356 12.6754 30.5424 13.9089 30.2168 15.1284C30.8067 15.7528 31.1698 16.5942 31.1699 17.521C31.1699 19.1946 29.99 20.5919 28.417 20.9292C28.2465 21.1422 27.998 21.2529 27.7363 21.2163C27.5622 21.1921 27.4099 21.1103 27.2949 20.9858C25.552 20.7928 24.1963 19.3154 24.1963 17.521C24.1965 15.5956 25.7573 14.0348 27.6826 14.0346C28.1199 14.0346 28.5382 14.1162 28.9238 14.2631C29.1061 13.3434 29.235 12.4532 29.3105 11.5776C29.3539 11.0781 29.3769 10.4458 29.377 9.79635C29.377 7.13795 29.0144 5.05344 28.4072 4.22213C28.1074 3.81231 27.9458 3.79264 27.3877 4.09518C24.4998 5.66111 20.8701 15.5075 20.0225 19.1879C20.0098 19.2402 19.9936 19.2953 19.9756 19.353C19.9512 19.4351 19.9195 19.5355 19.9131 19.6059C20.28 19.7731 21.8036 20.2774 22.6357 20.5385C26.6106 21.7855 30.2719 22.4742 33.5176 22.5844C34.6018 22.6206 37.1396 22.7074 38.0127 21.8637C38.2141 21.6696 38.3124 21.4363 38.3125 21.1528C38.3125 20.7363 38.1023 20.2111 37.6895 19.5932C36.7371 18.1682 34.8998 16.7792 33.5254 15.8657C33.351 15.7491 33.0291 15.5754 32.6885 15.3911C32.0137 15.0261 31.5587 14.7727 31.3789 14.5893C31.2308 14.4385 31.1495 14.2392 31.1494 14.0288C31.1494 13.6051 31.4698 13.2699 31.8799 13.2671C32.1266 13.2652 32.387 13.3852 32.5967 13.4819C32.6246 13.4945 32.6516 13.5073 32.6777 13.519C35.102 14.6042 40.2246 17.8369 40.5781 20.9018C40.5971 21.0626 40.6064 21.2228 40.6064 21.3764C40.6064 22.3424 40.2419 23.1662 39.5244 23.8276C37.0423 26.1137 31.0528 25.7475 29.877 25.6508C26.5707 25.378 23.0514 24.5232 19.1299 23.0395C19.0937 23.241 19.0546 23.4421 19.0176 23.6391C18.8712 24.4116 18.7189 25.2094 18.6484 25.9936C18.5969 26.5674 18.5713 27.1084 18.5713 27.5991C18.5713 29.087 18.8092 29.7298 19.0098 30.0063C19.1869 30.2511 19.4 30.3755 19.6602 30.3881C20.3062 30.4195 21.3046 29.7465 22.3291 28.5883C22.4773 28.4212 22.8907 27.8472 23.29 27.2924C24.3283 25.8521 24.4645 25.6911 24.5928 25.6333C24.9334 25.4779 25.3117 25.4991 25.6035 25.687C25.8818 25.8659 26.0478 26.1754 26.0479 26.5151C26.0479 26.6118 26.036 26.7105 26.0098 26.8081C25.9194 27.1514 25.441 27.9483 25 28.6694L24.9189 28.8032C24.1066 30.1396 23.3064 31.1828 22.541 31.9047C22.4887 31.9544 22.4181 32.0279 22.3496 32.0991C22.2448 32.2084 22.1455 32.3127 22.0732 32.3706C21.701 32.6696 21.17 32.9281 20.7012 33.1567C20.6379 33.1874 20.5753 33.2177 20.5156 33.2475C20.4876 33.3195 20.4408 33.3757 20.376 33.4145C20.2605 33.4831 20.1428 33.4628 20.0605 33.4331C18.7088 33.6382 17.7678 33.3212 16.8281 32.3491L16.7695 32.2885L16.7559 32.2055C16.7054 31.9008 16.598 31.8927 16.5518 31.8891L16.417 31.8794L16.3438 31.7651C15.3986 30.3022 14.9395 28.2711 14.9395 25.5542C14.9395 24.0796 15.0688 22.6254 15.1826 21.3432L15.1855 21.3159C13.0603 20.3066 11.1573 19.0855 9.52637 17.684C8.36077 16.682 6.37524 14.7162 6.18262 12.8051C6.16635 12.6416 6.1582 12.4801 6.1582 12.3247C6.1583 11.2796 6.53141 10.4169 7.2666 9.75924C9.2779 7.96208 13.5474 8.14121 15.9131 8.40865C17.8656 8.6289 18.0441 8.8022 18.1201 8.87643C18.2862 9.03894 18.3105 9.28041 18.3105 9.4106C18.3105 9.68982 18.2066 9.93134 18.0322 10.0551C17.7394 10.262 17.0538 10.1987 16.041 10.0786C15.7844 10.0479 15.563 10.0216 15.4355 10.0171C13.5732 9.94747 9.48593 10.2074 8.74316 11.4516C8.60874 11.6764 8.54401 11.9066 8.54395 12.1557C8.54395 13.0674 9.42208 14.1664 11.1533 15.4233C12.5168 16.4127 14.2029 17.3126 15.9287 17.9731C17.0528 13.4679 18.9061 9.24267 21.2979 5.73678L21.2949 5.7358Z"
        fill="url(#paint2_linear_1040_1507)"
      />
      <defs>
        <filter
          id="filter0_d_1040_1507"
          x="3.27441"
          y="26.1479"
          width="41.4053"
          height="21.1198"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.75" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1040_1507" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1040_1507" result="shape" />
        </filter>
        <radialGradient
          id="paint0_radial_1040_1507"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20.9652 38.0023) rotate(90) scale(7.2837 18.2092)"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#CCCCCC" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_1040_1507"
          x1="26.6846"
          y1="31.1744"
          x2="23.8607"
          y2="47.5862"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DDDDDD" stopOpacity="0.3" />
          <stop offset="0.360553" stopColor="white" />
          <stop offset="1" stopColor="#DDDDDD" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_1040_1507"
          x1="23.382"
          y1="0.787903"
          x2="23.382"
          y2="33.493"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2D2C39" />
          <stop offset="1" stopColor="#486466" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NavChevronIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative z-10 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M10 4L6 8L2 4"
        stroke={active ? "white" : "#666666"}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobileMenuButton({
  onClick,
  label,
  expanded,
  variant = "light",
}: {
  onClick: () => void;
  label: string;
  expanded: boolean;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className={cn(
        "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border",
        isDark
          ? "border-white/10 bg-white/[0.05]"
          : "border-black/[0.06] bg-black/[0.05]"
      )}
    >
      {expanded ? (
        <X
          className={cn("size-5", isDark ? "text-white" : "text-black")}
          strokeWidth={2}
        />
      ) : (
        <MenuIcon
          className={cn("size-5", isDark ? "text-white" : "text-black")}
        />
      )}
    </button>
  );
}

function MobileLogo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      className="flex w-[84px] items-center"
      aria-label={SITE_NAME}
      onClick={onClick}
    >
      <Image
        src="/Logo.png"
        alt={SITE_NAME}
        width={84}
        height={32}
        className="h-8 w-auto"
        priority
      />
    </Link>
  );
}

const MOBILE_SCROLL_RANGE = 120;
const MOBILE_HEADER_SPRING = { stiffness: 90, damping: 22, mass: 0.5 };

function MobileScrollHeader({
  mobileOpen,
  onOpenMenu,
  prefersReducedMotion,
}: {
  mobileOpen: boolean;
  onOpenMenu: () => void;
  prefersReducedMotion: boolean | null;
}) {
  const { scrollY } = useScroll();
  const rawProgress = useTransform(scrollY, [0, MOBILE_SCROLL_RANGE], [0, 1], {
    clamp: true,
  });
  const progress = useSpring(
    rawProgress,
    prefersReducedMotion
      ? { stiffness: 1000, damping: 100, mass: 0.1 }
      : MOBILE_HEADER_SPRING
  );

  const paddingTop = useTransform(progress, [0, 1], [12, 12]);
  const paddingBottom = useTransform(progress, [0, 1], [0, 12]);
  const innerPx = useTransform(progress, [0, 1], [0, 12]);
  const borderRadius = useTransform(progress, [0, 1], [0, 12]);
  const innerRadius = useTransform(progress, [0, 1], [0, 10.6]);
  const blurPx = useTransform(progress, [0, 1], [0, 10]);
  const backdropFilter = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.div
      className="pointer-events-auto px-3 md:hidden"
      style={{ paddingTop, paddingBottom }}
    >
      <div className="relative">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 p-[1.4px]"
          style={{
            opacity: progress,
            borderRadius,
            background: METALLIC_BORDER_BG,
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-[1.4px]"
          style={{
            opacity: progress,
            borderRadius: innerRadius,
            background: PILL_BAR_BG,
            backdropFilter,
            WebkitBackdropFilter: backdropFilter,
            boxShadow: PILL_BAR_SHADOW,
            transform: GPU_LAYER,
          }}
        />
        <motion.div
          className="relative flex h-14 items-center justify-between"
          style={{
            paddingLeft: innerPx,
            paddingRight: innerPx,
          }}
        >
          <MobileLogo />
          <MobileMenuButton
            onClick={onOpenMenu}
            label="Open menu"
            expanded={mobileOpen}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopProductOpen, setDesktopProductOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const productCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) setMobileProductOpen(false);
  }, [mobileOpen]);

  useEffect(() => {
    return () => {
      if (productCloseTimerRef.current) {
        clearTimeout(productCloseTimerRef.current);
      }
    };
  }, []);

  const openProductDropdown = () => {
    if (productCloseTimerRef.current) {
      clearTimeout(productCloseTimerRef.current);
      productCloseTimerRef.current = null;
    }
    setDesktopProductOpen(true);
  };

  const closeProductDropdown = () => {
    if (productCloseTimerRef.current) {
      clearTimeout(productCloseTimerRef.current);
    }
    productCloseTimerRef.current = setTimeout(
      () => setDesktopProductOpen(false),
      120
    );
  };

  const navigateTo = (href: string) => {
    navigateApp(href, navigate, pathname);
  };

  const handleItemClick = (_label: string, href: string) => {
    setDesktopProductOpen(false);
    navigateTo(href);
  };

  const handleMobileItemClick = (_label: string, href: string) => {
    setMobileOpen(false);
    setTimeout(() => navigateTo(href), 220);
  };

  return (
    <>
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-[1000]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[env(safe-area-inset-top)] bg-[#E5E5E5] md:hidden"
        />
        {/* Desktop */}
        <div className="pointer-events-auto relative mx-auto hidden w-full items-center justify-between gap-6 p-6 md:flex">
          <Link
            href="/"
            className="flex flex-1 items-center"
            aria-label={SITE_NAME}
          >
            <Image
              src="/Logo.png"
              alt={SITE_NAME}
              width={116}
              height={44}
              className="h-11 w-auto"
              priority
            />
          </Link>

          <div
            className="relative flex-shrink-0"
            onMouseLeave={closeProductDropdown}
          >
          <GlassPill radius={24} className="rounded-[24px]">
            <div
              className="relative flex items-center justify-center overflow-hidden border-[1.4px] border-white/40 px-3 py-2"
              style={{ borderRadius: 24 }}
            >
              <nav className="flex items-center gap-[6px]" aria-label="Main navigation">
                {NAV_LINKS.filter((item) => item.label !== "Home").map((item) => {
                  const isProduct = item.label === "Product";
                  // Black pill only while a dropdown tab is open; otherwise default.
                  const isHighlighted = isProduct && desktopProductOpen;
                  return (
                    <button
                      key={item.label}
                      onMouseEnter={
                        isProduct
                          ? openProductDropdown
                          : () => setDesktopProductOpen(false)
                      }
                      onFocus={isProduct ? openProductDropdown : undefined}
                      onClick={() => {
                        if (isProduct) {
                          openProductDropdown();
                          return;
                        }
                        handleItemClick(item.label, item.href);
                      }}
                      aria-expanded={isProduct ? desktopProductOpen : undefined}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-2 overflow-hidden rounded-full px-4 py-2 font-sans text-sm font-medium leading-none tracking-normal transition-[color,background-color,padding] duration-200",
                        isHighlighted
                          ? "px-4 font-semibold text-white"
                          : "text-[#4d4d4d] hover:bg-[#0000000d] hover:text-black"
                      )}
                    >
                      <AnimatePresence>
                        {isHighlighted && (
                          <motion.span
                            key="active-pill"
                            className="absolute inset-0 rounded-full bg-black"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            aria-hidden="true"
                          />
                        )}
                      </AnimatePresence>
                      <span className="relative z-10">{item.label}</span>
                      {item.hasDropdown && (
                        <NavChevronIcon active={isHighlighted} />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </GlassPill>
          <AnimatePresence>
            {desktopProductOpen && (
              <motion.div
                key="desktop-product-dropdown"
                className="absolute left-1/2 top-[58px] z-20 w-max max-w-[min(400px,calc(100vw-96px))] overflow-hidden rounded-[24px] border-[1.4px] p-4"
                style={{
                  background:
                    "linear-gradient(90.64deg, #FFFFFF 4.23%, rgba(255,255,255,0.8) 56%, rgba(223,227,230,0.8) 99.91%)",
                  borderColor: "#D9D9D9",
                  boxShadow:
                    "0 12px 50px 8px rgba(0,0,0,0.10), inset 0 -2px 4px rgba(255,255,255,0.30), inset 0 4px 6px rgba(255,255,255,0.20)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                }}
                initial={{ opacity: 0, y: -8, scale: 0.98, x: "-50%" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                exit={{ opacity: 0, y: -8, scale: 0.98, x: "-50%" }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                onMouseEnter={openProductDropdown}
                onMouseLeave={closeProductDropdown}
              >
                <div className="flex flex-col">
                  {PRODUCT_LINKS.map((product, i) => (
                    <Link
                      key={product.label}
                      href={product.href}
                      onClick={() => setDesktopProductOpen(false)}
                      className="nav-dropdown-item group flex items-center gap-4 rounded-[18px] px-2 py-4 transition-colors duration-200"
                    >
                      {i === 1 ? (
                        <ProductAgenticIcon className="size-12 shrink-0 opacity-60" />
                      ) : (
                        <ProductCubeIcon className="size-12 shrink-0 opacity-60" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="mb-2.5 block font-sans text-[18px] font-semibold leading-none tracking-normal text-black">
                          {product.label}
                        </span>
                        <span className="block font-sans text-sm font-normal leading-[18px] tracking-normal text-[#999999]">
                          {product.description}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          <div className="flex flex-1 items-center justify-end">
            <PillButtonCta className="font-medium" href={NAV_CTA_HREF}>{NAV_CTA}</PillButtonCta>
          </div>
        </div>

        <MobileScrollHeader
          mobileOpen={mobileOpen}
          onOpenMenu={() => setMobileOpen(true)}
          prefersReducedMotion={prefersReducedMotion}
        />
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="fixed inset-0 isolate z-[1001] flex flex-col gap-3 overflow-hidden p-3 md:hidden"
            style={{
              background:
                "linear-gradient(180deg, #1f1f1f 0%, #0a0a0a 100%)",
              backdropFilter: "blur(15px)",
              WebkitBackdropFilter: "blur(15px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          >
            {/* Watermark — logo chạy ngang chân menu */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 flex w-[240vw] select-none opacity-50"
              animate={
                prefersReducedMotion
                  ? undefined
                  : { x: ["0%", "-50%"] }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 18, ease: "linear", repeat: Infinity }
              }
            >
              {[0, 1].map((i) => (
                <Image
                  key={i}
                  src="/images/Logo.png"
                  alt=""
                  width={525}
                  height={200}
                  aria-hidden="true"
                  className="h-auto w-[min(525px,120vw)] shrink-0"
                />
              ))}
            </motion.div>

            <GlassPill>
              <div className="flex h-14 items-center justify-between px-3">
                <MobileLogo onClick={() => setMobileOpen(false)} />
                <MobileMenuButton
                  onClick={() => setMobileOpen(false)}
                  label="Close menu"
                  expanded
                  variant="dark"
                />
              </div>
            </GlassPill>

            <div className="relative flex min-h-0 w-full flex-1 flex-col justify-between">
              <nav className="w-full px-2" aria-label="Mobile navigation">
                {NAV_LINKS.map((item, idx) => {
                  const isProduct = item.label === "Product";
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isProduct) {
                            setMobileProductOpen((open) => !open);
                            return;
                          }
                          handleMobileItemClick(item.label, item.href);
                        }}
                        aria-expanded={isProduct ? mobileProductOpen : undefined}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-6 px-3 py-5 text-left text-[20px] tracking-[-0.2px] text-white",
                          idx > 0 && "border-t border-white/10"
                        )}
                      >
                        <span className="flex-1">{item.label}</span>
                        {item.hasDropdown && (
                          <ChevronDown
                            className={cn(
                              "size-4 text-white transition-transform duration-200",
                              isProduct && mobileProductOpen && "rotate-180"
                            )}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                      {isProduct && (
                        <AnimatePresence initial={false}>
                          {mobileProductOpen && (
                            <motion.div
                              key="mobile-product-links"
                              className="overflow-hidden"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: prefersReducedMotion ? 0 : 0.22,
                              }}
                            >
                              {PRODUCT_LINKS.map((product) => (
                                <Link
                                  key={product.label}
                                  href={product.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex w-full items-center border-t border-white/10 py-5 pl-10 pr-3 text-[18px] tracking-[-0.2px] text-white/90 active:bg-white/10"
                                >
                                  {product.label}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="flex h-[110px] w-full items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    navigateTo(NAV_CTA_HREF);
                  }}
                  className="relative flex h-11 w-[276px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-3xl pl-6 pr-4"
                  style={{
                    background:
                      "linear-gradient(136deg, #333 0.79%, #0d0d0d 35.22%, #262626 99.16%)",
                    boxShadow:
                      "inset 0 2px 4px 0 rgba(0,0,0,0.2), inset 0 -2px 4px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  {!prefersReducedMotion && (
                    <>
                      <StarBorderLayer
                        color="rgba(255,255,255,0.95)"
                        speed="5s"
                      />
                      <span
                        aria-hidden
                        className="absolute z-[1] rounded-[inherit]"
                        style={{
                          inset: 1.5,
                          background:
                            "linear-gradient(136deg, #333 0.79%, #0d0d0d 35.22%, #262626 99.16%)",
                        }}
                      />
                    </>
                  )}
                  <span className="relative z-[2] whitespace-nowrap text-base font-medium tracking-[-0.32px] text-white">
                    {NAV_CTA}
                  </span>
                  <ArrowRight
                    className="relative z-[2] size-[18px] text-white"
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
