import * as Brevo from '@getbrevo/brevo';

export default async function handler(req, res) {
  // 1. Check if the method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Get data from the request body
  const { studentName, studentEmail, applicationNumber } = req.body;

  // 3. Get API key from environment variables
  const apiKey = process.env.BREVO_API_KEY;

  // --- START DEBUGGING ---
  // Log if API key is loaded
  console.log("BREVO_API_KEY loaded:", !!apiKey);
  if (!apiKey) {
    console.error("BREVO_API_KEY is not defined in environment variables.");
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }
  
  // Log incoming request
  console.log("Sending email to:", studentEmail, "for:", studentName);
  // --- END DEBUGGING ---

  // 4. Configure Brevo API
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.authMethods.apiKey.apiKey = apiKey;

  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  // 5. Construct the email
  sendSmtpEmail.subject = `Application Received - MZR Super 40 (${applicationNumber})`;
  sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <h1>Application Received!</h1>
        <p>Dear ${studentName},</p>
        <p>We have successfully received your application for the MZR Super 40 entrance test.</p>
        <p>Your Application Number is: <strong>${applicationNumber}</strong></p>
        <p>Please keep this number safe for all future correspondence, including checking your application status and downloading your admit card.</p>
        <p>Best of luck!</p>
        <p>The MZR Super 40 Team</p>
      </body>
    </html>
  `;
  
  // --- THIS IS CRITICAL ---
  // You MUST verify this email in your Brevo "Senders" settings
  sendSmtpEmail.sender = { email: 'mzrsab@gmail.com', name: 'MZR Super 40' };
  
  sendSmtpEmail.to = [
    { email: studentEmail, name: studentName }
  ];

  // 6. Send the email
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    // --- START DEBUGGING ---
    console.log('Brevo response:', data);
    // --- END DEBUGGING ---
    return res.status(200).json({ message: 'Email sent successfully', data });
  } catch (error) {
    // --- START DEBUGGING ---
    console.error('Brevo error:', error.message);
    // Log the full error if possible
    if (error.response) {
      console.error('Brevo error body:', error.response.body);
    }
    // --- END DEBUGGING ---
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}

