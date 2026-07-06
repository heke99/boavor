export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: 'Ny',
  open: 'Öppen',
  waiting_on_user: 'Väntar på användaren',
  resolved: 'Löst',
  closed: 'Stängd',
}

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  account: 'Konto',
  application: 'Ansökningar',
  listing: 'Annonser',
  billing: 'Betalning',
  gdpr: 'GDPR',
  technical: 'Tekniskt',
  other: 'Övrigt',
}

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'Låg',
  normal: 'Normal',
  high: 'Hög',
  urgent: 'Akut',
}
