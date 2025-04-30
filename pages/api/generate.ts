import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audience, topic, goal, tone } = req.body;

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned');

    res.status(200).json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate content' });
  }
}
