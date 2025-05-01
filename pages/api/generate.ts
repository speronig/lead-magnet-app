import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

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
    console.log('🧠 Calling OpenAI with prompt...');
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

    if (!json.choices || !json.choices[0]?.message?.content) {
      const errorMsg = json?.error?.message || 'No content returned';
      throw new Error(`OpenAI Error: ${errorMsg}`);
    }

    const content = json.choices[0].message.content;
    console.log('✅ OpenAI content received');

    // 🔹 Create PDF via PDFMonkey
    const monkeyResponse = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PDFMONKEY_API_KEY}`,
      },
      body: JSON.stringify({
        document: {
          template_id: process.env.PDFMONKEY_TEMPLATE_ID,
          payload: {
            title: topic,
            body: content,
          },
          status: 'draft',
        },
      }),
    });

    const monkeyJson = await monkeyResponse.json();

    if (!monkeyJson?.data?.attributes?.download_url) {
      throw new Error(`PDFMonkey Error: ${JSON.stringify(monkeyJson)}`);
    }

    const downloadUrl = monkeyJson.data.attributes.download_url;
    console.log('📄 PDF URL:', downloadUrl);

    const pdfDownload = await fetch(downloadUrl);
    const pdfBytes = await pdfDownload.arrayBuffer();
    console.log('✅ PDF downloaded, size:', pdfBytes.byteLength);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    console.log('✅ SMTP verified');

    await transporter.sendMail({
      from: 'test@leadmagnet.dev',
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

    console.log('✅ Email sent to:', email);
    res.status(200).json({ message: 'PDF sent successfully', content });
  } catch (err) {
    console.error('❌ Error in handler:', err);
    res.status(500).json({ error: 'Failed to generate or send content' });
  }
}
