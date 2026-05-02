import {
  IconBrandAirbnb,
  IconBrandAmazon,
  IconBrandApple,
  IconBrandDropbox,
  IconBrandFigma,
  IconBrandGithub,
  IconBrandGitlab,
  IconBrandGoogle,
  IconBrandMeta,
  IconBrandNotion,
  IconBrandPaypal,
  IconBrandSlack,
  IconBrandSpotify,
  IconBrandStripe,
  IconBrandWindows,
  type IconProps,
} from "@tabler/icons-react"
import { type ComponentType } from "react"

type CustomerBrandPresentation = {
  icon?: ComponentType<IconProps>
  className: string
  fallback: string
}

const CUSTOMER_BRAND_BY_ID: Record<string, CustomerBrandPresentation> = {
  "lattice-cloud": {
    icon: IconBrandGoogle,
    className: "bg-sky-600 text-white",
    fallback: "L",
  },
  "northstar-health": {
    icon: IconBrandWindows,
    className: "bg-emerald-600 text-white",
    fallback: "N",
  },
  aeroloft: {
    icon: IconBrandAirbnb,
    className: "bg-indigo-600 text-white",
    fallback: "A",
  },
  "polar-banking": {
    icon: IconBrandPaypal,
    className: "bg-zinc-900 text-white",
    fallback: "P",
  },
  brightharbor: {
    icon: IconBrandDropbox,
    className: "bg-amber-600 text-white",
    fallback: "B",
  },
  "fieldhouse-retail": {
    icon: IconBrandAmazon,
    className: "bg-rose-600 text-white",
    fallback: "F",
  },
  "cinder-ai": {
    icon: IconBrandFigma,
    className: "bg-fuchsia-600 text-white",
    fallback: "C",
  },
  "summit-grid": {
    icon: IconBrandStripe,
    className: "bg-violet-600 text-white",
    fallback: "S",
  },
  "verdant-pay": {
    icon: IconBrandStripe,
    className: "bg-lime-600 text-white",
    fallback: "V",
  },
  "maple-security": {
    icon: IconBrandGithub,
    className: "bg-orange-600 text-white",
    fallback: "M",
  },
  "orbit-fulfillment": {
    icon: IconBrandAmazon,
    className: "bg-cyan-600 text-white",
    fallback: "O",
  },
  "blueforge-labs": {
    icon: IconBrandGitlab,
    className: "bg-blue-600 text-white",
    fallback: "B",
  },
  "helios-energy": {
    icon: IconBrandSpotify,
    className: "bg-teal-600 text-white",
    fallback: "H",
  },
  "riverbank-insure": {
    icon: IconBrandNotion,
    className: "bg-slate-700 text-white",
    fallback: "R",
  },
  "nova-ops": {
    icon: IconBrandSlack,
    className: "bg-green-600 text-white",
    fallback: "N",
  },
  "pinecrest-media": {
    icon: IconBrandMeta,
    className: "bg-pink-600 text-white",
    fallback: "P",
  },
  "prism-health": {
    icon: IconBrandApple,
    className: "bg-red-600 text-white",
    fallback: "P",
  },
  "apex-mobility": {
    icon: IconBrandMeta,
    className: "bg-indigo-600 text-white",
    fallback: "A",
  },
  "cloudmint-finance": {
    icon: IconBrandPaypal,
    className: "bg-violet-700 text-white",
    fallback: "C",
  },
}

const DEFAULT_BRAND: CustomerBrandPresentation = {
  className: "bg-muted text-muted-foreground",
  fallback: "C",
}

export function getCustomerBrandPresentation(
  customerId: string,
  companyName: string
) {
  const preset = CUSTOMER_BRAND_BY_ID[customerId]
  if (preset) return preset

  return {
    ...DEFAULT_BRAND,
    fallback: companyName.charAt(0).toUpperCase() || DEFAULT_BRAND.fallback,
  }
}
