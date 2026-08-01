import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();

type ContactRequest = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactToEmail = process.env.CONTACT_TO_EMAIL || 'dirving.mrsms@gmail.com';
const contactFromEmail = process.env.CONTACT_FROM_EMAIL || 'M.R.S. Medical Services <onboarding@resend.dev>';

function cleanField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

router.post('/', async (request, response) => {
  const body = request.body as ContactRequest;
  const name = cleanField(body.name);
  const phone = cleanField(body.phone);
  const email = cleanField(body.email);
  const message = cleanField(body.message);

  if (!name || !phone || !message) {
    response.status(400).json({ message: 'Name, phone, and message are required.' });
    return;
  }

  if (!resend) {
    response.status(500).json({ message: 'Contact email is not configured.' });
    return;
  }

  const replyTo = email || contactToEmail;
  const submittedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  });

  try {
    await resend.emails.send({
      from: contactFromEmail,
      to: contactToEmail,
      replyTo,
      subject: `New M.R.S. Medical Services message from ${name}`,
      text: [
        'New website contact message',
        '',
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email || 'Not provided'}`,
        `Submitted: ${submittedAt}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });

    response.json({ message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Resend contact email failed', error);
    response.status(502).json({ message: 'Message could not be sent right now.' });
  }
});

export default router;
