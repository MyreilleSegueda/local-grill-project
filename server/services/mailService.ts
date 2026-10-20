import nodemailer from 'nodemailer';

export const mailTransport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendMail({ 
  to, 
  subject, 
  html, 
  attachments 
}: { 
  to: string; 
  subject: string; 
  html: string;
  attachments?: Attachment[];
}) {
  return mailTransport.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
    attachments,
  });
}
