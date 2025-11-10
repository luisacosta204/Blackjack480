import { useState } from 'react';
import { recordGameResult } from './api/game';

export default function GameStub() {
  const [status, setStatus] = useState<string>('');

  async function submit(won: boolean, delta: number) {
    setStatus('Saving...');
    try {
      await recordGameResult(won, delta);
      setStatus('Saved!');
    } catch (e: any) {
      setStatus(e.message || 'Error');
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', color: '#eee', fontFamily: 'system-ui, sans-serif' }}>
      <h2>Game (stub)</h2>
      <p>Use these to simulate a round while the real UI is built.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => submit(true, 100)}>Win +100</button>
        <button onClick={() => submit(false, -50)}>Lose -50</button>
      </div>
      <p>{status}</p>
    </div>
  );
}
