import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Extract the registration data from the request body
    const body = await req.json();
    const { name, email, program, category, enrollmentType } = body;

    if (!name || !email || !program) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Mubeen Academy <no-reply@yourverifieddomain.com>', // IMPORTANT: Replace with your verified domain
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
            <li><strong>Category:</strong> ${category}</li>
            <li><strong>Enrollment Type:</strong> ${enrollmentType}</li>
          </ul>
          <p>Please proceed with the payment to secure your spot. A member of our team will be in touch with you within <strong>24 hours</strong> to confirm the next steps.</p>
          <p>If you have any questions, please do not hesitate to contact our support team by replying to this email or sending a message to <a href="mailto:mubeenacademy001@gmail.com">mubeenacademy001@gmail.com</a>.</p>
          <p>JazakAllah Khair,<br/>The Mubeen Academy Team</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new NextResponse('Error sending email', { status: 500 });
    }

    return NextResponse.json({ message: 'Email sent successfully!', data });

  } catch (error) {
    console.error("API Error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}