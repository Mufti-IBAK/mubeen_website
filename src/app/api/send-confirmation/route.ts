import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'Mubeen Academy <no-reply@example.com>'; // configure in env

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, program, category, enrollmentType } = body;

    if (!name || !email || !program) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKeyMissing = !process.env.RESEND_API_KEY;
    if (apiKeyMissing) {
      console.warn('RESEND_API_KEY not configured; skipping email send');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM, // Set in env to a verified domain
      to: [email],
      subject: 'Your Registration for Mubeen Academy is Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #4299e1;">Assalamu 'alaykum ${name},</h2>
          <p>Thank you for registering for the <strong>${program}</strong> at Mubeen Academy!</p>
          <p>We have received your application and are excited to have you join our community of learners. Here are the details of your registration:</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Program:</strong> ${program}</li>
            ${category ? `<li><strong>Category:</strong> ${category}</li>` : ''}
            ${enrollmentType ? `<li><strong>Enrollment Type:</strong> ${enrollmentType}</li>` : ''}
          </ul>
          <p>Please proceed with the payment to secure your spot. A member of our team will be in touch with you within <strong>24 hours</strong> to confirm the next steps.</p>
          <p>If you have any questions, please do not hesitate to contact our support team by replying to this email or sending a message to <a href="mailto:mubeenacademy001@gmail.com">mubeenacademy001@gmail.com</a>.</p>
          <p>JazakAllah Khair,<br/>The Mubeen Academy Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Error sending email' }, { status: 200 }); // Do not fail the flow
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 200 }); // Do not block the flow
  }
}
