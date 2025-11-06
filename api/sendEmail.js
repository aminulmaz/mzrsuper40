// Serverless function: /api/sendEmail
// Works on Vercel/Netlify. DO NOT expose BREVO_API_KEY on the client!

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { studentName, studentEmail, applicationNumber } = req.body || {};
    if (!studentName || !studentEmail || !applicationNumber) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Compose email
    const subject = `Ajmal Super 40 - Application Received (${applicationNumber})`;
    const htmlContent = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
        <h2>Application Received</h2>
        <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
        <p>Thanks for applying to <strong>Ajmal Super 40</strong>.</p>
        <p>Your Application Number is: <strong>${escapeHtml(applicationNumber)}</strong></p>
        <p>Please keep this number for future reference.</p>
        <hr/>
        <p>Regards,<br/>Ajmal Super 40 Team</p>
      </div>
    `;

    // Call Brevo
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY, // <-- set in Vercel/Netlify env
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Ajmal Super 40', email: 'mzrsab@gmail.com' }, // use a verified sender
        to: [{ email: studentEmail, name: studentName }],
        subject,
        htmlContent
      })
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!resp.ok) {
      console.error('Brevo error:', data);
      res.status(resp.status).json({ error: data?.message || data?.raw || 'Brevo error' });
      return;
    }

    res.status(200).json({ ok: true, brevo: data });
  } catch (err) {
    console.error('sendEmail handler failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// basic HTML escape
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
