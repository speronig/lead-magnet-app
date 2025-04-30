import React, { useState } from 'react';

export default function Home() {
  const [audience, setAudience] = useState('');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadMagnet, setLeadMagnet] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setLeadMagnet('');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience, topic, goal, tone, email }),
    });

    const data = await response.json();
    setLeadMagnet(data.content);
    setLoading(false);
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Lead Magnet Generator</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px' }}>
        <label>Audience:</label>
        <input value={audience} onChange={(e) => setAudience(e.target.value)} required />

        <label>Topic:</label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} required />

        <label>Goal:</label>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} required />

        <label>Tone:</label>
        <input value={tone} onChange={(e) => setTone(e.target.value)} required />

        <label>Email:</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Generating...' : 'Generate Lead Magnet'}
        </button>
      </form>

      {leadMagnet && (
        <div style={{ marginTop: '2rem', whiteSpace: 'pre-wrap' }}>
          <h2>Generated Lead Magnet</h2>
          <p>{leadMagnet}</p>
        </div>
      )}
    </div>
  );
}
