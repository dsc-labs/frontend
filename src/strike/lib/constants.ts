import { EXTERNAL_LINKS, ROUTES } from "./navigate";
import { BRAND_SOCIALS } from "./socialLinks";

export const SITE_NAME = "STRIKE ROBOT";

export const SITE_TAGLINE = "The 3D spatial creation platform for intelligent robots";
export const SITE_DESCRIPTION =
  "SR Platform generates physics-valid simulation environments, production-grade 3D assets, and training-ready datasets — from a single natural language description.";

export const NAV_LINKS = [
  { label: "About", href: ROUTES.home },
  { label: "Product", href: ROUTES.srPlatform, hasDropdown: true },
  { label: "Simulation", href: ROUTES.simulation },
];

export const NAV_CTA = "Create with SR Platform";
export const NAV_CTA_HREF = ROUTES.srPlatformApp;

/** Bump `?v=` when replacing in-place so browsers fetch the new file. */
const HERO_VIDEO_V = "2";

export const VIDEOS = {
  hero: `/Video/Comp%202.mp4?v=${HERO_VIDEO_V}`,
  featureEditor: "/Video/Comp%201.mp4",
  communityExplore: "/Video/Community%20Creation.mp4",
  communityBlog: "/Video/Blog-Articles.mp4",
} as const;

export const HERO_BACKGROUND = "/Background.png";
export const HERO_BACKGROUND_MOBILE = "/Top%20Bg_Sticky.png";

export const HERO = {
  badge1: { label: "3D Spatial Creation", color: "#317e6a" },
  badge2: { label: "Physical AI", color: "#69419d" },
  headlinePrefix: "The 3D spatial creation platform for ",
  headlineAccent: "intelligent robots",
  description:
    "SR Platform generates physics-valid simulation environments, production-grade 3D assets, and training-ready datasets — from a single natural language description",
  ctaPrimary: "Create with SR Platform",
  ctaPrimaryHref: ROUTES.srPlatformApp,
  ctaSecondary: "Read about SR Platform",
  ctaSecondaryHref: ROUTES.home,
};

export const FEATURES_SECTION = {
  headline: "Bring pixel world to reality",
  description:
    "Introducing SR Platform — our first-generation platform for building rich, persistent 3D spaces with high visual fidelity and spatial accuracy, designed for users to navigate, shape, and experience as their own.",
  cta: "Create with SR Platform",
  ctaHref: ROUTES.srPlatformApp,
};

export const FEATURES = [
  {
    id: "asset-creation",
    title: "Asset Creation",
    description:
      "Generate custom 3D geometry from text, or photograph any real-world object to reconstruct it as a production-grade mesh with physically-based materials. Every asset is indexed into a shared library that improves every future scene.",
    boldPhrase: "custom 3D geometry",
    icon: "Box",
    videoSrc: "/Video/SR%20Platform%20feature/Asset%20Creation_30fps.mp4",
  },
  {
    id: "spatial-layout",
    title: "Spatial Layout Generation",
    description:
      "Compose full simulation environments from natural language descriptions. SR Platform arranges objects, surfaces, and lighting with physics constraints baked in — ready for robot navigation tasks.",
    icon: "LayoutGrid",
    videoSrc:
      "/Video/SR%20Platform%20feature/Spatial%20Layout%20Generation1_30fps.mp4",
  },
  {
    id: "stimulation",
    title: "Simulation & Rollouts",
    description:
      "Run thousands of robot policy rollouts inside generated environments. Every simulation is instrumented with sensor outputs, collision data, and task success metrics exported automatically.",
    icon: "Car",
    videoSrc:
      "/Video/SR%20Platform%20feature/Simulations%20%26%20Rollout_30fps.mp4",
  },
  {
    id: "realtime-edit",
    title: "Edit In Realtime",
    description:
      "Modify scenes on the fly — swap assets, adjust physics parameters, and regenerate lighting without leaving the platform. Changes propagate across all active simulation instances instantly.",
    icon: "PencilLine",
    videoSrc: "/Video/SR%20Platform%20feature/Edit%20In%20Realtime_30fps.mp4",
  },
];

export const SCROLLING_TEXT = {
  parts: ["Spatial", "Intelligence", "Platform"],
};

export const COMMUNITY = {
  explore: {
    tag: "#Explore",
    title: "Community Creations",
    description:
      "See what teams and researchers are building — simulation environments, training datasets, and robot tasks generated with SR Platform.",
    hoverLabel: "Explore Showcase",
  },
  blog: {
    tag: "#News",
    title: "Blog/\nArticles",
    description:
      "Discover the innovators, researchers, and visionary founders pushing the boundaries of artificial intelligence and robotics",
    hoverLabel: "Explore More",
  },
};

export const VIDEO_CTA = {
  background: "/Vid.png",
  wordmark: "sr platform",
  cta: "Create with SR Platform",
  ctaHref: ROUTES.srPlatformApp,
  rotatingBadge: "STRIKE ROBOT • STRIKE ROBOT • STRIKE ROBOT • STRIKE ROBOT • ",
  sidebarLinks: [
    { label: "About", href: ROUTES.home },
    { label: "SR Platform", href: ROUTES.srPlatform },
    { label: "SR Agentic", href: ROUTES.agentic },
    { label: "Mindshare", href: ROUTES.mindshareChallenge },
    { label: "Docs", href: EXTERNAL_LINKS.docs },
  ],
};

export type CtaVariant = "platform" | "agentic" | "about";

export const CTA_VARIANTS: Record<
  CtaVariant,
  { wordmark: string; cta: string; ctaHref: string; subtitleLines: string[] }
> = {
  platform: {
    wordmark: "sr platform",
    cta: "Create with SR Platform",
    ctaHref: ROUTES.srPlatformApp,
    subtitleLines: ["Build physical AI with"],
  },
  agentic: {
    wordmark: "sr agentic",
    cta: "Build with SR Agentic",
    ctaHref: ROUTES.waitlist,
    subtitleLines: ["Give your robots", "real-world judgment with"],
  },
  about: {
    wordmark: "physical ai",
    cta: "Create with SR Platform",
    ctaHref: ROUTES.srPlatformApp,
    subtitleLines: ["Let's build the future of"],
  },
};

export const FOOTER = {
  copyright:
    "© 2026 Strike Robot. All rights reserved. SR Platform™ is a trademark of Strike Robot.",
  socials: [...BRAND_SOCIALS],
};

// ---------------- AGENTIC PAGE (/agentic) ----------------

export const AGENTIC_HERO = {
  wordmark: "SR\nAGENTIC",
  videoSrc: "/Video/Comp%202-old.mp4",
  badge: "Task-Conditioned Scene Graph Navigation",
  headlinePrefix: "Ephemeral intelligence for robots that ",
  headlineAccent: "act in the real world.",
  description:
    "SR Agentic builds task-shaped spatial understanding on the fly — and adapts the instant the world changes. No universal map to maintain, no stale world model to fight.",
  ctaPrimary: "Build with Agentic",
  ctaPrimaryHref: ROUTES.waitlist,
  ctaSecondary: "Read about proposal",
  ctaSecondaryHref: EXTERNAL_LINKS.docs,
  videoCaption:
    "A short look at how SR Agentic turns a natural-language task into a lean, task-shaped world model — running a fast safety loop on the robot and deep reasoning in the cloud.",
};

export const AGENTIC_LAYER_SECTION = {
  headline: "One intelligence layer, four working parts.",
  description:
    "SR Agentic sits between perception and action — it decides what to understand, builds only that, verifies before it commits, and keeps the robot safe throughout.",
};

export const AGENTIC_PARTS = [
  {
    id: "tcsg",
    title: "Task-Conditioned Scene Graph",
    description:
      "Builds a Task-Conditioned Scene Graph (TC-SG) — picking or synthesizing the right spatial ontology before it maps. The map is a function of the task, not a fixed universal schema.",
    media: "/SR%20Agentic%20Assets/S1.gif",
  },
  {
    id: "open-vocab",
    title: "Open-vocabulary perception",
    description:
      "Detects and grounds objects it was never explicitly trained on, fusing detection, segmentation, and captioning into the live scene understanding.",
    media: "/SR%20Agentic%20Assets/S2.gif",
  },
  {
    id: "realtime",
    title: "Real-time adaptation",
    description:
      "Change detection updates the world model as the environment shifts; the planner re-plans on the fly instead of acting on a stale snapshot.",
    media: "/SR%20Agentic%20Assets/S3.gif",
  },
  {
    id: "trust",
    title: "Trust & anti-hallucination",
    description:
      "Confidence gating, grounded retrieval, and visual verification mean the robot abstains and re-checks rather than acting on a confident guess.",
    media: "/SR%20Agentic%20Assets/S4.gif",
  },
];

export const AGENTIC_LOOP = {
  headlineLine1: "A fast loop on the robot",
  headlineLine2: "A deep loop in the cloud",
  description:
    "A lightweight safety loop runs continuously on the edge — the robot stays safe and moving even if the cloud link drops. Heavy multimodal reasoning runs only when something new happens, which is what makes foundation-model intelligence affordable at fleet scale.",
  edge: {
    label: "EDGE",
    subtitle: "on the robot",
    timing: "Fast loop • Always on",
    cadence: "Continuous, low-latency",
    nodes: [
      { title: "Sensors + local SLAM", subtitle: "RGB-D • LiDAR • pose" },
      { title: "Obstacle avoidance", subtitle: "Real-time adaptation" },
      { title: "Safety governor", subtitle: "Allow-list • e-stop • waypoints" },
    ],
  },
  cloud: {
    label: "CLOUD",
    subtitle: "GPU Cluster",
    timing: "Deep loop • Event-triggered",
    cadence: "Triggered by new events",
    nodes: [
      { title: "Open-vocab perception", subtitle: "Detect · segment · caption" },
      { title: "Build TC-SG", subtitle: "Task-Conditioned Scene Graph" },
      { title: "Reasoning + planner", subtitle: "Subgoals · verify · abstain" },
    ],
  },
};

export const AGENTIC_AWARENESS = {
  tag: "ACROSS ROBOTS AND MISSIONS",
  headline: "One awareness engine. Re-shaped for every deployment.",
  description:
    "The same intelligence layer adapts to each robot and each task through reusable schema templates — so every deployment gets focused, accurate navigation, not a bloated general-purpose map.",
  slides: [
    {
      id: "security-patrol",
      title: "Autonomous security patrol",
      description:
        "Routine patrols of warehouses, substations, and construction sites. The robot maps only persistent infrastructure, flags anomalies, and adapts to what's changed since the last sweep.",
      imageSrc: "/agentic/awareness/security-patrol.png",
      mobileImageSrc: "/agentic/awareness/anh-1.png",
    },
    {
      id: "factory-inspection",
      title: "Factory floor inspection",
      description:
        "Walk production lines with task-conditioned attention on equipment, conveyors, and operators. Detect deviations from baseline and surface only what needs a human decision.",
      imageSrc: "/agentic/awareness/factory-inspection.png",
      mobileImageSrc: "/agentic/awareness/anh-2.png",
    },
    {
      id: "search-rescue",
      title: "Search and rescue",
      description:
        "Indoor search-and-rescue across unfamiliar buildings — schema templates focus on victims, exits, and hazards instead of trying to map the entire structure to centimeter accuracy.",
      imageSrc: "/agentic/awareness/search-rescue.png",
      mobileImageSrc: "/agentic/awareness/anh-3.png",
    },
  ],
};

export const AGENTIC_OEMS = {
  tag: "DEVELOP WITH SR AGENTIC",
  headlinePart1: "Built for robotics teams ",
  headlinePart2: "and hardware",
  headlineAccent: "oems",
  description:
    "Integrate the awareness layer and keep your own action policies closed. SR Agentic gives you deployable navigation intelligence without rebuilding spatial reasoning for every new environment.",
  bullets: [
    {
      title: "Open-vocabulary perception",
      description:
        "Detects and grounds objects it was never explicitly trained on, fusing detection, segmentation, and captioning into the live scene understanding.",
      icon: "/agentic/oems/perception.png",
    },
    {
      title: "Deploy across domains with reusable schema templates",
      description:
        "Indoor service, factory patrol, search-and-rescue — a new client scenario is a new schema template, not a new mapping system to build from scratch.",
      icon: "/agentic/oems/domains.png",
    },
    {
      title: "Edge-to-cloud, deployable out of the box",
      description:
        "Runs as a split edge/cloud stack: an always-on safety loop on Jetson-class hardware, event-triggered reasoning on an autoscaling GPU cluster.",
      icon: "/agentic/oems/edge-cloud.png",
    },
    {
      title: "Security and reliability planes around every action",
      description:
        "Action allow-lists, a safety governor, sandboxed execution, and an immutable audit log bound what a robot can physically do in the field.",
      icon: "/agentic/oems/security.png",
    },
  ],
};

// ---------------- ABOUT PAGE (/about) ----------------

export const ABOUT_HERO = {
  titlePrefix: "About",
  titleAccent: "StrikeRobot",
  followLabel: "Follow us on",
  followHref: EXTERNAL_LINKS.x,
  description:
    "StrikeRobot builds the intelligence and infrastructure layer for the next generation of physical AI — giving robots the spatial understanding to act in the real world, and giving the teams that build them the tools to get there faster.",
  image: "/about/hero-hands.png",
  socials: [...BRAND_SOCIALS],
};

type MissionRun = { text: string; bold?: boolean };

export const ABOUT_MISSION: {
  headline: string;
  watermark: string;
  readMore: string;
  readLess: string;
  paragraphs: MissionRun[][];
  handLeft: string;
  handRight: string;
} = {
  headline:
    "We build physical AI infrastructure — from the data that trains robots to the intelligence that runs on them.",
  watermark: "sr agentic",
  readMore: "Read Full",
  readLess: "Hide content",
  paragraphs: [
    [
      {
        text: "Robotics has a hard truth at its center: intelligent machines need enormous volumes of high-quality spatial data to learn, and a robust layer of real-time reasoning to act once they're deployed. Both have been bottlenecks for the entire industry. StrikeRobot exists to remove them.",
      },
    ],
    [
      { text: "Our two products attack the problem from both ends. " },
      { text: "SR Platform", bold: true },
      {
        text: " is a 3D spatial creation platform that turns a natural-language description into physics-valid simulation environments and training-ready datasets — compressing what used to take a team months into a single day. ",
      },
      { text: "SR Agentic", bold: true },
      {
        text: " is an ephemeral intelligence layer that builds task-shaped spatial understanding on the fly, so robots act appropriately in the real world and adapt the instant it changes.",
      },
    ],
    [
      {
        text: "We're a team of engineers and researchers working closely with humanoid labs, hardware OEMs, and infrastructure partners to put deployable robot intelligence into the field — built on open foundations and an onchain economic layer that lets robots participate as autonomous economic actors.",
      },
    ],
  ],
  handLeft: "/about/hand-left.png",
  handRight: "/about/hero-right.png",
};

export const ABOUT_PARTNERS: {
  headline: string;
  description: string;
  // `invert` recolors a white-on-transparent logo to black so it reads on the white card.
  logos: { name: string; src: string; invert?: boolean }[];
} = {
  headline: "Our trusted partnership",
  description:
    "We work with leading infrastructure, compute, and ecosystem partners to bring deployable robot intelligence to the field.",
  logos: [
    { name: "Virtuals Protocol", src: "/about/Logo Partners/Virtuals Protocol.png" },
    { name: "Base", src: "/about/Logo Partners/Base.png" },
    { name: "Reppo", src: "/about/Logo Partners/Reppo.png" },
    { name: "Eastworlds", src: "/about/Logo Partners/Eastworlds.png" },
    { name: "Venice", src: "/about/Logo Partners/Venice.png" },
    { name: "Orboh", src: "/about/Logo Partners/Orboh.png" },
  ],
};
