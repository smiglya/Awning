/**
 * Chat widget content, kept separate from the mechanics.
 *
 * IMPORTANT — replace CONTACT_EMAIL before launch. There is no backend, so the
 * mailto escape hatch is the ONLY route a lead actually reaches you by. With a
 * wrong address here, every request submitted on the site is lost.
 */

export const CONTACT_EMAIL = 'hello@awning.nyc'

export const CHAT_COPY = {
  launcher: 'Chat with us',
  launcherReturning: 'Back to your request',
  launcherOpen: 'Close',
  formTitle: 'Get a price',
  formSub: 'Two taps and two lines. You get a number back, not a proposal.',
  // Stated from first paint. The scripted replies must never pose as a person.
  automatedNotice: 'Replies here are automated. A person follows up by email.',
  submitLabel: 'Start my request',
  submittingLabel: 'Opening request',
  threadTitle: 'Your request',
  inputPlaceholder: 'Write a message',
  sendLabel: 'Send',
  supportName: 'Support',
  supportTag: 'automated',
  typingLabel: 'Support is typing',
  emailLabel: 'Email this to us',
  emailHint: 'Carries your request number and answers, so you retype nothing.',
  storageWarning: 'This device is not saving the thread. Email is the safe path.',
  resetLabel: 'Start over',
  fallbackReply:
    'Added to {ticket}. Replies here are automated, so send the email and a person picks it up.',

  // Shown when the server refused the request. Says what actually happened,
  // because a lead that silently went nowhere is the worst outcome here.
  deliveryFailed:
    'Not sent yet. Your answers are saved on this device and we keep retrying. Email is the sure route.',
  deliveryRetry: 'Try sending now',
  deliveryRetrying: 'Sending',
  deliverySent: 'Sent. We have it.',
}

import type { LeadFields } from '../api/types'

export interface FormField {
  name: keyof LeadFields
  label: string
  type: 'text' | 'select'
  required: boolean
  placeholder?: string
  options: string[]
}

export const FORM_FIELDS: FormField[] = [
  {
    name: 'businessName',
    label: 'Business name',
    type: 'text',
    required: true,
    placeholder: 'What it says on the awning',
    options: [],
  },
  {
    name: 'businessType',
    label: 'What kind of business',
    type: 'select',
    required: true,
    options: [
      'Restaurant or cafe',
      'Food truck',
      'Bodega or deli',
      'Barbershop or salon',
      'Nail salon or spa',
      'Gym or studio',
      'Dentist or clinic',
      'Contractor or trades',
      'Movers or cleaners',
      'Laundromat',
      'Auto shop',
      'Something else',
    ],
  },
  {
    name: 'needType',
    label: 'What you need',
    type: 'select',
    required: true,
    options: [
      'First site for the business',
      'Replace an old site',
      'One page and a phone number',
      'Fix what I have',
      'Not sure yet',
    ],
  },
  {
    name: 'contact',
    label: 'Email or phone',
    type: 'text',
    required: true,
    placeholder: 'Either one is fine',
    options: [],
  },
  {
    name: 'budget',
    label: 'Rough budget',
    type: 'select',
    required: false,
    options: ['$200 to $400', '$400 to $650', '$650 to $900', 'Not sure yet'],
  },
]

/**
 * Scripted replies. Note s3: it quotes two conditional prices rather than one,
 * because a timer cannot read the answer to s2 and must not pretend it did.
 */
export const SUPPORT_SCRIPT = [
  'Thanks for the details. Your request is {ticket}, and it stays here if you close the tab.',
  'One question decides the price: do people need to book or order online, or just find you and call?',
  'Find and call is $450. Booking or ordering is $700. One payment, no monthly fee.',
  'Build time is 1 to 2 days from when I have your photos, hours and address.',
  'Next step: tap Email this to us. It carries {ticket} and your answers so you retype nothing.',
]

/** Swapped in for s3 when the visitor picked the lowest budget band. */
export const SUPPORT_SCRIPT_LOW_BUDGET =
  'A one page site is $300. Find and call with a few pages is $450. One payment, no monthly fee.'
