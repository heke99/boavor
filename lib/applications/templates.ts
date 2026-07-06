/** Rejection reason templates (Swedish, landlord-facing). */

export const REJECTION_TEMPLATES = [
  {
    id: 'income',
    label: 'Inkomstkrav',
    text: 'Din ansökan uppfyller tyvärr inte hyresvärdens inkomstkrav för den här bostaden.',
  },
  {
    id: 'queue_position',
    label: 'Kötid/urval',
    text: 'Bostaden gick till en sökande med längre kötid. Din ansökan var komplett och du är välkommen att söka fler bostäder.',
  },
  {
    id: 'documents',
    label: 'Ofullständiga dokument',
    text: 'Din ansökan kunde inte gå vidare eftersom efterfrågade dokument saknades eller inte kunde verifieras.',
  },
  {
    id: 'household',
    label: 'Hushållsstorlek',
    text: 'Bostadens storlek matchar tyvärr inte ditt hushåll enligt hyresvärdens riktlinjer.',
  },
  {
    id: 'other',
    label: 'Annan sökande valdes',
    text: 'Hyresvärden har gått vidare med en annan sökande. Tack för din ansökan.',
  },
] as const

export type RejectionTemplateId = (typeof REJECTION_TEMPLATES)[number]['id']
