/**
 * Bovaro product modules and feature flags.
 *
 * Every module can be toggled through an environment variable so features can
 * be rolled out gradually per environment without code changes. Flags are read
 * on the server; expose a flag to the client only by passing it down as a
 * prop from a server component.
 *
 * Environment override convention: NEXT_PUBLIC_MODULE_<SNAKE_CASE_NAME>=true|false
 * e.g. NEXT_PUBLIC_MODULE_SALE_MARKETPLACE=false
 */

export type ProductModule =
  | 'rentalMarketplace'
  | 'commercialMarketplace'
  | 'saleMarketplace'
  | 'bovaroPlus'
  | 'bovaroByta'
  | 'landlordSaas'
  | 'externalQueues'
  | 'publicApi'
  | 'whiteLabelPortals'
  | 'supportDesk'
  | 'salesCrm'

/**
 * Default rollout state. Rental is the core product; the broader marketplace
 * modules that already exist in production stay enabled. Modules that are not
 * built yet default to disabled and are turned on batch by batch.
 */
const MODULE_DEFAULTS: Record<ProductModule, boolean> = {
  rentalMarketplace: true,
  commercialMarketplace: true,
  saleMarketplace: true,
  bovaroPlus: false,
  bovaroByta: true,
  landlordSaas: true,
  externalQueues: true,
  publicApi: false,
  whiteLabelPortals: false,
  supportDesk: false,
  salesCrm: false,
}

function toEnvKey(module: ProductModule) {
  const snake = module.replace(/[A-Z]/g, (char) => `_${char}`).toUpperCase()
  return `NEXT_PUBLIC_MODULE_${snake}`
}

export function parseModuleOverride(value: string | undefined | null): boolean | null {
  if (value === undefined || value === null) return null
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'on', 'yes'].includes(normalized)) return true
  if (['false', '0', 'off', 'no'].includes(normalized)) return false
  return null
}

export function isModuleEnabled(module: ProductModule, env: NodeJS.ProcessEnv = process.env): boolean {
  const override = parseModuleOverride(env[toEnvKey(module)])
  if (override !== null) return override
  return MODULE_DEFAULTS[module]
}

export function getEnabledModules(env: NodeJS.ProcessEnv = process.env): ProductModule[] {
  return (Object.keys(MODULE_DEFAULTS) as ProductModule[]).filter((module) => isModuleEnabled(module, env))
}

/** Swedish display metadata for each module, used by admin and status pages. */
export const MODULE_INFO: Record<ProductModule, { label: string; description: string }> = {
  rentalMarketplace: {
    label: 'Hyresmarknad',
    description: 'Förstahandsuthyrning med sök, annonser och ansökningar.',
  },
  commercialMarketplace: {
    label: 'Kommersiella lokaler',
    description: 'Lokaler, kontor, parkering, förråd och mark.',
  },
  saleMarketplace: {
    label: 'Bostäder till salu',
    description: 'Marknadsplats för bostäder och objekt till salu.',
  },
  bovaroPlus: {
    label: 'Bovaro Plus',
    description: 'Premiumtjänst för bostadssökande med utökade förmåner.',
  },
  bovaroByta: {
    label: 'Bovaro Byta',
    description: 'Bostadsbyte mellan hyresgäster med verifierade profiler.',
  },
  landlordSaas: {
    label: 'Hyresvärdsverktyg',
    description: 'Arbetsyta för hyresvärdar med fastigheter, ansökningar och analys.',
  },
  externalQueues: {
    label: 'Externa köer',
    description: 'Bevaka och få påminnelser om externa bostadsköer.',
  },
  publicApi: {
    label: 'Publikt API',
    description: 'API och webhooks för större hyresvärdar och systemintegrationer.',
  },
  whiteLabelPortals: {
    label: 'White label-portaler',
    description: 'Egna varumärkta bostadsportaler för större hyresvärdar.',
  },
  supportDesk: {
    label: 'Support och hjälpcenter',
    description: 'Ärendehantering och hjälpartiklar för användare och hyresvärdar.',
  },
  salesCrm: {
    label: 'Sälj-CRM',
    description: 'Leads, demo och ROI-verktyg för att vinna hyresvärdskunder.',
  },
}
