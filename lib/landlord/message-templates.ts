/**
 * Default landlord message templates (Swedish). Used as starting points in
 * document requests, viewing invitations and offers.
 */

export const LANDLORD_MESSAGE_TEMPLATES = [
  {
    id: 'rejection',
    label: 'Avslag',
    subject: 'Besked om din bostadsansökan',
    body: 'Hej!\n\nTack för din ansökan. Vi har tyvärr gått vidare med en annan sökande för den här bostaden. Din ansökan sparas inte längre för det här objektet, men du är varmt välkommen att söka fler bostäder hos oss.\n\nVänliga hälsningar',
  },
  {
    id: 'document_request',
    label: 'Begäran om dokument',
    subject: 'Komplettering till din ansökan',
    body: 'Hej!\n\nFör att kunna gå vidare med din ansökan behöver vi följande underlag:\n\n• Inkomstintyg eller lönespecifikation för de senaste tre månaderna\n\nLadda upp dokumenten i din Bovaro-profil under Dokument, så uppdateras din ansökan automatiskt.\n\nVänliga hälsningar',
  },
  {
    id: 'viewing_invite',
    label: 'Visningsinbjudan',
    subject: 'Inbjudan till visning',
    body: 'Hej!\n\nVi vill gärna bjuda in dig till visning av bostaden. Bekräfta tiden via din ansökan i Bovaro.\n\nVänliga hälsningar',
  },
  {
    id: 'offer',
    label: 'Erbjudande',
    subject: 'Erbjudande om bostaden',
    body: 'Hej!\n\nVi är glada att kunna erbjuda dig bostaden. Svara på erbjudandet via din ansökan i Bovaro inom angiven tid.\n\nVänliga hälsningar',
  },
] as const
