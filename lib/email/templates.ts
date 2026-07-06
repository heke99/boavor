/**
 * Central email template registry (Swedish). Every outgoing email uses a
 * registered template so that content, category (for preferences) and
 * auditing stay consistent.
 */

export type EmailTemplateKey =
  | 'saved_search_matches'
  | 'unread_message'
  | 'external_queue_reminder'
  | 'weekly_digest'

export type EmailCategory =
  | 'applications'
  | 'messages'
  | 'queue'
  | 'saved_searches'
  | 'byta'
  | 'marketing'
  | 'digest'

type TemplateDefinition<TData> = {
  category: EmailCategory
  subject: (data: TData) => string
  text: (data: TData) => string
}

export type SavedSearchMatchesData = {
  searchTitle: string
  listings: Array<{ title: string; city: string; url: string }>
  manageUrl: string
}

export type UnreadMessageData = {
  threadSubject: string
  threadUrl: string
}

export type ExternalQueueReminderData = {
  title: string
  queueName: string
  renewalDate: string | null
  manageUrl: string
}

export type WeeklyDigestData = {
  matchCount: number
  searchCount: number
  listUrl: string
}

function footer() {
  return '\n\nHälsningar,\nBovaro\n\nDu kan ändra dina notisinställningar under Inställningar i din översikt.'
}

export const EMAIL_TEMPLATES: {
  saved_search_matches: TemplateDefinition<SavedSearchMatchesData>
  unread_message: TemplateDefinition<UnreadMessageData>
  external_queue_reminder: TemplateDefinition<ExternalQueueReminderData>
  weekly_digest: TemplateDefinition<WeeklyDigestData>
} = {
  saved_search_matches: {
    category: 'saved_searches',
    subject: (data) => `Nya bostäder matchar din bevakning "${data.searchTitle}"`,
    text: (data) =>
      `Hej!\n\nDin sökbevakning "${data.searchTitle}" har ${data.listings.length} ny${data.listings.length === 1 ? '' : 'a'} träff${data.listings.length === 1 ? '' : 'ar'}:\n\n${data.listings
        .slice(0, 5)
        .map((listing) => `• ${listing.title} – ${listing.city}: ${listing.url}`)
        .join('\n')}\n\nHantera dina bevakningar: ${data.manageUrl}${footer()}`,
  },
  unread_message: {
    category: 'messages',
    subject: (data) => `Oläst meddelande: ${data.threadSubject}`,
    text: (data) =>
      `Hej!\n\nDu har ett oläst meddelande i tråden "${data.threadSubject}" på Bovaro.\n\nLäs och svara här: ${data.threadUrl}${footer()}`,
  },
  external_queue_reminder: {
    category: 'queue',
    subject: (data) => `${data.title} — ${data.queueName}`,
    text: (data) =>
      `Hej!\n\n${data.queueName}${data.renewalDate ? ` — förnyelse ${data.renewalDate}` : ''}. Uppdatera dina uppgifter under Alla mina köer.\n\n${data.manageUrl}${footer()}`,
  },
  weekly_digest: {
    category: 'digest',
    subject: (data) => `Din veckosammanfattning: ${data.matchCount} nya bostadsträffar`,
    text: (data) =>
      `Hej!\n\nUnder den senaste veckan fick dina ${data.searchCount} sökbevakningar totalt ${data.matchCount} nya träffar.\n\nSe alla träffar: ${data.listUrl}${footer()}`,
  },
}
