import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audience, topic, goal, tone, email } = req.body;

  if (!audience || !topic || !goal || !tone || !email) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const prompt = `
Create a 5-page lead magnet based on the following:

Audience: ${audience}
Topic: ${topic}
Goal: ${goal}
Tone: ${tone}

Include:
1. A catchy title
2. An engaging introduction
3. 3–5 helpful sections
4. A strong conclusion with a call to action

Use clear formatting, short paragraphs, and bullet points where appropriate.
`;

  try {
    // 🔹 Call OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a professional marketing assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const json = await aiResponse.json();
    
    // Log the full OpenAI response to Vercel logs
    console.log("OpenAI raw response:", JSON.stringify(json, null, 2));
    
    if (!json.choices || !json.choices[0]?.message?.content) {
      const errorMsg = json?.error?.message || 'No content returned';
      throw new Error(`OpenAI Error: ${errorMsg}`);
    }
    
    const content = json.choices[0].message.content;
    console.log("✅ OpenAI content generated");

    // 🔹 Generate PDF from AI content
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    // Wrap text into lines that fit page width
    const lines = content.split('\n').flatMap((line: string) =>
    line.match(/.{1,90}(\s|$)/g) || ['']
    );

    let y = height - 40;
    for (const line of lines) {
      if (y < 40) {
        y = height - 40;
        pdfDoc.addPage();
      }
      page.drawText(line.trim(), { x: 40, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= 16;
    }

    const pdfBytes = await pdfDoc.save();
    console.log("✅ PDF generated, size:", pdfBytes.length);

    // 🔹 Email the PDF with Nodemailer
    console.log("📤 Sending email to:", email);
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // Brevo requires STARTTLS
        auth: {
          user: process.env.SMTP_USER, // your email login
          pass: process.env.SMTP_PASS, // the generated SMTP key
        },
      });      

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Your Lead Magnet PDF',
        text: 'Here is your custom lead magnet!',
        attachments: [
          {
            filename: 'lead-magnet.pdf',
            content: Buffer.from(pdfBytes),
          },
        ],
      });
      console.log("✅ Email sent to", email);

    res.status(200).json({ message: 'PDF sent successfully', content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}