import { InspectedElementInfo } from '../types';

export interface TokenItem {
  name: string;
  hex: string;
  role: string;
  tailwindClass: string;
  contrastWhite: boolean;
}

export const COLOR_TOKENS: Record<string, TokenItem[]> = {
  Brand: [
    { name: 'Primary Terracotta', hex: '#9B2F00', role: 'Brand Anchor & Main Buttons', tailwindClass: 'bg-[#9b2f00] text-white', contrastWhite: true },
    { name: 'Primary Container', hex: '#C2410C', role: 'Active State & Primary CTAs', tailwindClass: 'bg-[#c2410c] text-white', contrastWhite: true },
    { name: 'Primary Fixed', hex: '#FFDBD0', role: 'Subtle Tag & Highlight Background', tailwindClass: 'bg-[#ffdbd0] text-[#390c00]', contrastWhite: false },
    { name: 'On-Primary Container', hex: '#FFECE7', role: 'Light Terracotta Tint', tailwindClass: 'bg-[#ffece7] text-[#9b2f00]', contrastWhite: false },
  ],
  Secondary: [
    { name: 'Sunlit Amber', hex: '#904D00', role: 'Secondary Accents & Highlights', tailwindClass: 'bg-[#904d00] text-white', contrastWhite: true },
    { name: 'Secondary Container', hex: '#FE932C', role: 'Quick Actions & Star Badges', tailwindClass: 'bg-[#fe932c] text-[#663500]', contrastWhite: false },
    { name: 'Secondary Fixed', hex: '#FFDCC3', role: 'Soft Amber Pill Background', tailwindClass: 'bg-[#ffdcc3] text-[#2f1500]', contrastWhite: false },
    { name: 'Secondary Fixed Dim', hex: '#FFB77D', role: 'Muted Amber Element Accent', tailwindClass: 'bg-[#ffb77d] text-[#2f1500]', contrastWhite: false },
  ],
  Canonical: [
    { name: 'Sacramental Green', hex: '#006243', role: 'Baptism & Verified Status', tailwindClass: 'bg-[#006243] text-white', contrastWhite: true },
    { name: 'Tertiary Container', hex: '#007D57', role: 'Active Attending Badges', tailwindClass: 'bg-[#007d57] text-white', contrastWhite: true },
    { name: 'Tertiary Fixed', hex: '#85F8C4', role: 'Honorary & Elder Badges', tailwindClass: 'bg-[#85f8c4] text-[#002114]', contrastWhite: false },
    { name: 'Canonical Alert Error', hex: '#BA1A1A', role: 'Strict Guard & Destructive Action', tailwindClass: 'bg-[#ba1a1a] text-white', contrastWhite: true },
  ],
  Surfaces: [
    { name: 'Canvas Surface', hex: '#FFF8F5', role: 'Warm Earthen App Canvas', tailwindClass: 'bg-[#fff8f5] text-[#1e1b19]', contrastWhite: false },
    { name: 'Sidebar Sand', hex: '#F8F1E9', role: 'Nav Rail & Surface Framing', tailwindClass: 'bg-[#f8f1e9] text-[#1e1b19]', contrastWhite: false },
    { name: 'Card Surface Lowest', hex: '#FFFFFF', role: 'High Legibility Pure White Cards', tailwindClass: 'bg-white text-[#1e1b19]', contrastWhite: false },
    { name: 'Container Low', hex: '#FAF2EE', role: 'Interactive Card Inset / Input BG', tailwindClass: 'bg-[#faf2ee] text-[#1e1b19]', contrastWhite: false },
    { name: 'Hairline Stroke', hex: '#EAE1D7', role: 'Structural Borders & Dividers', tailwindClass: 'bg-[#eae1d7] text-[#59413a]', contrastWhite: false },
    { name: 'On-Surface Stone', hex: '#1E1B19', role: 'High Contrast Volcanic Body Text', tailwindClass: 'bg-[#1e1b19] text-white', contrastWhite: true },
  ],
};

export const TYPOGRAPHY_TOKENS = [
  { level: 'Headline XL', size: '40px / 48px', weight: 'Bold 700', tailwind: 'font-headline text-[40px] leading-[48px] font-bold tracking-tight', sample: 'Members & Pastoral Care' },
  { level: 'Headline LG', size: '32px / 40px', weight: 'Semibold 600', tailwind: 'font-headline text-[32px] leading-[40px] font-semibold tracking-tight', sample: '1,248 Active Souls on Roll' },
  { level: 'Headline MD', size: '24px / 32px', weight: 'Semibold 600', tailwind: 'font-headline text-[24px] leading-[32px] font-semibold tracking-tight', sample: 'Christian Intake & Sacramental Record' },
  { level: 'Headline SM', size: '20px / 28px', weight: 'Semibold 600', tailwind: 'font-headline text-[20px] leading-[28px] font-semibold tracking-tight', sample: 'The Vance Household (#108)' },
  { level: 'Title MD', size: '16px / 24px', weight: 'Semibold 600', tailwind: 'font-headline text-[16px] leading-[24px] font-semibold', sample: 'Caleb Timothy Vance' },
  { level: 'Label MD', size: '14px / 20px', weight: 'Semibold 600', tailwind: 'font-headline text-[14px] leading-[20px] font-semibold tracking-wide', sample: 'Covenant Partner' },
  { level: 'Label SM', size: '12px / 16px', weight: 'Semibold 600', tailwind: 'font-headline text-[12px] leading-[16px] font-semibold tracking-wide', sample: 'Canon 4.12 Strict Guard' },
  { level: 'Body LG', size: '16px / 26px', weight: 'Regular 400', tailwind: 'font-body text-[16px] leading-[26px]', sample: 'Comprehensive parish roll, sacramental registry, and ecclesiastical records.' },
  { level: 'Body MD', size: '14px / 22px', weight: 'Regular 400', tailwind: 'font-body text-[14px] leading-[22px]', sample: 'Register an individual for pastoral oversight, formal church membership, and sacramental fellowship.' },
  { level: 'Body SM', size: '13px / 18px', weight: 'Regular 400', tailwind: 'font-body text-[13px] leading-[18px]', sample: 'All sacramental and personal records are encrypted under ecclesiastical privilege.' },
];

export const SPACING_TOKENS = [
  { token: 'space-xs', value: '4px', tailwind: 'p-1 / gap-1', useCase: 'Icon margins, radio gap, pill micro padding' },
  { token: 'space-sm', value: '8px', tailwind: 'p-2 / gap-2', useCase: 'Button internal padding, segmented pill gaps' },
  { token: 'space-md', value: '16px', tailwind: 'p-4 / gap-4', useCase: 'Standard form element gutters, toolbar clusters' },
  { token: 'space-lg', value: '24px', tailwind: 'p-6 / gap-6', useCase: 'Card inner padding, section separations' },
  { token: 'space-xl', value: '32px', tailwind: 'p-8 / gap-8', useCase: 'Major canvas blocks, grid margins' },
  { token: 'margin', value: '40px', tailwind: 'p-10 / gap-10', useCase: 'Desktop canvas outer breathing room' },
];

export const SHADOW_TOKENS = [
  { name: 'Warm Ambient Card (Level 1)', tailwind: 'shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)]' },
  { name: 'Raised Interactive (Level 2)', tailwind: 'shadow-[0_4px_8px_-2px_rgba(28,25,23,0.06),0_12px_24px_-4px_rgba(194,65,12,0.05)]' },
  { name: 'Floating Modal / Toast (Level 3)', tailwind: 'shadow-[0_12px_32px_-4px_rgba(28,25,23,0.12),0_4px_12px_-2px_rgba(194,65,12,0.08)]' },
  { name: 'Primary Button Glow', tailwind: 'shadow-[0_2px_8px_rgba(194,65,12,0.25)]' },
];

export const SAMPLE_INSPECTABLE_ELEMENTS: InspectedElementInfo[] = [
  {
    id: 'church-stat-card',
    name: 'ParishCensusStatCard',
    category: 'Cards & Metrics',
    tailwindClasses: 'relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-[#EAE1D7]/60 hover:shadow-md transition-all',
    cssProps: {
      display: 'flex',
      padding: '24px',
      margin: '0px',
      borderRadius: '12px',
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(234, 225, 215, 0.6)',
      color: '#1E1B19',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '32px',
    },
    dimensions: {
      width: 280,
      height: 148,
    },
  },
  {
    id: 'save-member-btn',
    name: 'PrimarySaveButton',
    category: 'Buttons & Triggers',
    tailwindClasses: 'px-5 py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer',
    cssProps: {
      display: 'inline-flex',
      padding: '10px 20px',
      margin: '0px',
      borderRadius: '8px',
      backgroundColor: '#C2410C',
      border: 'none',
      color: '#FFFFFF',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '14px',
    },
    dimensions: {
      width: 160,
      height: 42,
    },
  },
  {
    id: 'canonical-guard-banner',
    name: 'CanonicalNoticeBanner',
    category: 'Banners & Alerts',
    tailwindClasses: 'relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ffdad6] via-[#eee7e3] to-[#f4ece8] p-6 shadow-sm border border-[#e1bfb5]/40',
    cssProps: {
      display: 'flex',
      padding: '24px',
      margin: '0px 0px 24px 0px',
      borderRadius: '12px',
      backgroundColor: '#FFDAD6',
      border: '1px solid rgba(225, 191, 181, 0.4)',
      color: '#1E1B19',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '20px',
    },
    dimensions: {
      width: 1120,
      height: 124,
    },
  },
  {
    id: 'covenant-partner-pill',
    name: 'CovenantPartnerBadge',
    category: 'Badges & Status',
    tailwindClasses: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c2410c] text-white font-semibold text-xs shadow-sm',
    cssProps: {
      display: 'inline-flex',
      padding: '2px 10px',
      margin: '0px',
      borderRadius: '9999px',
      backgroundColor: '#C2410C',
      border: 'none',
      color: '#FFFFFF',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
    },
    dimensions: {
      width: 132,
      height: 24,
    },
  },
  {
    id: 'household-unit-card',
    name: 'HouseholdUnitCard',
    category: 'Cards & Containers',
    tailwindClasses: 'rounded-xl bg-white p-6 shadow-sm border border-[#EAE1D7] flex flex-col justify-between hover:shadow-md transition-shadow',
    cssProps: {
      display: 'flex',
      padding: '24px',
      margin: '0px',
      borderRadius: '12px',
      backgroundColor: '#FFFFFF',
      border: '1px solid #EAE1D7',
      color: '#1E1B19',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '14px',
    },
    dimensions: {
      width: 360,
      height: 480,
    },
  },
];
