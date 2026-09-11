import { useEffect, useState } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState('checking API...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) =>
        setApiStatus(`${data.service} — ${data.status} (uptime ${Math.round(data.uptime)}s)`)
      )
      .catch(() => setApiStatus('API unreachable — is the server running on port 5000?'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center p-10 bg-white rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-indigo-700">Nova Schola Hub</h1>
        <p className="mt-3 text-base text-slate-500">
          Scaffold placeholder — Tailwind CSS is working.
        </p>
        <span className="inline-block mt-5 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700">
          {apiStatus}
        </span>
      </div>
    </div>
  );
}

export default App;