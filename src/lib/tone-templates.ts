export type Tone = "PROFESSIONAL" | "FRIENDLY" | "DIRECT"

export type AlertType =
  | "LEAD_CREATED"
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"

export interface ToneTemplate {
  subject: string
  body: string
  smsBody: string
}

export const ALERT_LABELS: Record<AlertType, string> = {
  LEAD_CREATED: "New Lead (Contact Form)",
  BOOKING_CREATED: "Booking Received",
  BOOKING_CONFIRMED: "Booking Confirmed",
  BOOKING_CANCELLED: "Booking Cancelled",
}

export const TONE_LABELS: Record<Tone, string> = {
  PROFESSIONAL: "Professional",
  FRIENDLY: "Friendly",
  DIRECT: "Direct",
}

export const TONE_DESCRIPTIONS: Record<Tone, string> = {
  PROFESSIONAL: "Formal and polished communication style",
  FRIENDLY: "Warm and conversational tone",
  DIRECT: "Short, clear, and to the point",
}

export const toneTemplates: Record<AlertType, Record<Tone, ToneTemplate>> = {
  LEAD_CREATED: {
    PROFESSIONAL: {
      subject: "Thank you for contacting {{workspaceName}}",
      body: "Dear {{customerName}},\n\nThank you for reaching out to {{workspaceName}}. We have received your inquiry and a member of our team will respond promptly.\n\nIn the meantime, you may schedule an appointment at your convenience: {{bookingUrl}}\n\nWe appreciate your interest and look forward to assisting you.\n\nBest regards,\n{{workspaceName}}",
      smsBody: "Dear {{customerName}}, thank you for contacting {{workspaceName}}. We will respond shortly. Book an appointment: {{bookingUrl}} — {{workspaceName}}",
    },
    FRIENDLY: {
      subject: "Hey {{customerName}}! Thanks for reaching out 😊",
      body: "Hi {{customerName}}! 👋\n\nThanks so much for getting in touch with us at {{workspaceName}}! We're excited to hear from you and we'll get back to you really soon.\n\nWant to book an appointment right away? Here you go: {{bookingUrl}}\n\nTalk soon!\n{{workspaceName}}",
      smsBody: "Hi {{customerName}}! 👋 Thanks for reaching out to {{workspaceName}}! We'll get back to you soon. Book here: {{bookingUrl}}",
    },
    DIRECT: {
      subject: "We got your message — {{workspaceName}}",
      body: "Hi {{customerName}},\n\nWe received your message. We'll get back to you shortly.\n\nBook an appointment here: {{bookingUrl}}\n\n— {{workspaceName}}",
      smsBody: "Hi {{customerName}}, we got your message. Book here: {{bookingUrl}} — {{workspaceName}}",
    },
  },
  BOOKING_CREATED: {
    PROFESSIONAL: {
      subject: "Booking Confirmation — {{workspaceName}}",
      body: "Dear {{customerName}},\n\nThank you for scheduling your {{bookingType}} appointment with {{workspaceName}}.\n\nDate & Time: {{startAt}}\n\nYour booking has been received and is pending confirmation. We will notify you once it has been reviewed.\n\nPlease complete any required forms here: {{formUrl}}\n\nBest regards,\n{{workspaceName}}",
      smsBody: "Dear {{customerName}}, your {{bookingType}} on {{startAt}} has been received by {{workspaceName}}. We will confirm shortly. Forms: {{formUrl}}",
    },
    FRIENDLY: {
      subject: "You're booked in, {{customerName}}! 🎉",
      body: "Hi {{customerName}}! 🎉\n\nAwesome — your {{bookingType}} appointment is all set!\n\nWhen: {{startAt}}\n\nWe just need to confirm it on our end, and we'll let you know ASAP.\n\nOne more thing — if there are any forms to fill out, you can do that here: {{formUrl}}\n\nSee you soon!\n{{workspaceName}}",
      smsBody: "Hi {{customerName}}! 🎉 Your {{bookingType}} on {{startAt}} is booked with {{workspaceName}}! We'll confirm soon. Forms: {{formUrl}}",
    },
    DIRECT: {
      subject: "Booking received — {{bookingType}}",
      body: "Hi {{customerName}},\n\nYour {{bookingType}} booking for {{startAt}} has been received. We'll confirm it shortly.\n\nForms: {{formUrl}}\n\n— {{workspaceName}}",
      smsBody: "Hi {{customerName}}, {{bookingType}} on {{startAt}} received. We'll confirm shortly. Forms: {{formUrl}} — {{workspaceName}}",
    },
  },
  BOOKING_CONFIRMED: {
    PROFESSIONAL: {
      subject: "Your Appointment is Confirmed — {{workspaceName}}",
      body: "Dear {{customerName}},\n\nWe are pleased to confirm your {{bookingType}} appointment.\n\nDate & Time: {{startAt}}\nLocation: {{address}}\n\nPlease arrive a few minutes early. Should you need to reschedule, do not hesitate to contact us.\n\nWe look forward to seeing you.\n\nBest regards,\n{{workspaceName}}",
      smsBody: "Dear {{customerName}}, your {{bookingType}} on {{startAt}} is confirmed. Location: {{address}}. We look forward to seeing you. — {{workspaceName}}",
    },
    FRIENDLY: {
      subject: "You're all set, {{customerName}}! ✅",
      body: "Hi {{customerName}}! ✅\n\nGreat news — your {{bookingType}} appointment is confirmed!\n\nWhen: {{startAt}}\nWhere: {{address}}\n\nWe can't wait to see you! If anything comes up, just let us know.\n\nCheers,\n{{workspaceName}}",
      smsBody: "Hi {{customerName}}! ✅ Your {{bookingType}} on {{startAt}} is confirmed! See you at {{address}}! — {{workspaceName}}",
    },
    DIRECT: {
      subject: "Booking confirmed — {{bookingType}}",
      body: "Hi {{customerName}},\n\nYour {{bookingType}} on {{startAt}} is confirmed.\n\nAddress: {{address}}\n\n— {{workspaceName}}",
      smsBody: "Hi {{customerName}}, {{bookingType}} on {{startAt}} confirmed. Address: {{address}} — {{workspaceName}}",
    },
  },
  BOOKING_CANCELLED: {
    PROFESSIONAL: {
      subject: "Booking Cancellation Notice — {{workspaceName}}",
      body: "Dear {{customerName}},\n\nWe wish to inform you that your {{bookingType}} appointment scheduled for {{startAt}} has been cancelled.\n\nIf this was done in error or you wish to rebook, please do not hesitate to reach out to us.\n\nWe apologize for any inconvenience.\n\nBest regards,\n{{workspaceName}}",
      smsBody: "Dear {{customerName}}, your {{bookingType}} on {{startAt}} has been cancelled. Please contact {{workspaceName}} to rebook.",
    },
    FRIENDLY: {
      subject: "Your booking has been cancelled, {{customerName}}",
      body: "Hi {{customerName}},\n\nJust letting you know that your {{bookingType}} appointment on {{startAt}} has been cancelled.\n\nIf this wasn't right or you'd like to rebook, just reach out — we're happy to help! 😊\n\nTake care,\n{{workspaceName}}",
      smsBody: "Hi {{customerName}}, your {{bookingType}} on {{startAt}} has been cancelled. Want to rebook? Just reach out to {{workspaceName}}! 😊",
    },
    DIRECT: {
      subject: "Booking cancelled — {{bookingType}}",
      body: "Hi {{customerName}},\n\nYour {{bookingType}} booking for {{startAt}} has been cancelled. Contact us to rebook.\n\n— {{workspaceName}}",
      smsBody: "Hi {{customerName}}, {{bookingType}} on {{startAt}} cancelled. Contact {{workspaceName}} to rebook.",
    },
  },
}

export const ALERT_TYPES: AlertType[] = [
  "LEAD_CREATED",
  "BOOKING_CREATED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
]

export const TONES: Tone[] = ["PROFESSIONAL", "FRIENDLY", "DIRECT"]
