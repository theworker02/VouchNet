'use client';

import { FormEvent, useState } from 'react';
import { isLoopbackRuntimeUrl } from './local-runtime-policy';

type Measurement = { elapsedMs: number; status: number; preview: string };

async function fetchWithBudget(url: string, init?: RequestInit): Promise<Measurement> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      status: response.status,
      preview: text.slice(0, 320),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function LocalRuntimeBenchmark() {
  const [endpoint, setEndpoint] = useState('http://localhost:11434/api/tags');
  const [model, setModel] = useState('');
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function measureEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoopbackRuntimeUrl(endpoint)) {
      setStatus(
        'Enter one explicit http(s) loopback URL. Remote hosts and credentialed URLs are blocked.',
      );
      return;
    }
    setRunning(true);
    setMeasurement(null);
    setStatus(null);
    try {
      const result = await fetchWithBudget(endpoint);
      setMeasurement(result);
      setStatus(
        result.status >= 200 && result.status < 400
          ? 'Measured directly from this browser. Nothing was sent to VouchNet.'
          : 'The local endpoint responded, but returned a non-success status.',
      );
    } catch {
      setStatus(
        'The browser could not reach that local endpoint. Confirm it is running and permits this site through CORS.',
      );
    } finally {
      setRunning(false);
    }
  }

  async function measureOllama() {
    const ollamaUrl = 'http://localhost:11434/api/generate';
    if (model.trim().length === 0) {
      setStatus('Enter the installed local Ollama model name before running an inference.');
      return;
    }
    setRunning(true);
    setMeasurement(null);
    setStatus(null);
    try {
      const result = await fetchWithBudget(ollamaUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: model.trim(),
          prompt: 'Reply with only the word benchmark.',
          stream: false,
        }),
      });
      setMeasurement(result);
      setStatus(
        result.status >= 200 && result.status < 400
          ? 'Local inference measured. The prompt and output remain in this browser.'
          : 'Ollama responded, but did not accept that model request.',
      );
    } catch {
      setStatus(
        'Local Ollama did not respond. Check that it is running and permits browser CORS requests.',
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="local-runtime-benchmark" aria-labelledby="local-runtime-benchmark-title">
      <div>
        <p className="eyebrow">Local runtime bench</p>
        <h2 id="local-runtime-benchmark-title">Measure an explicit local endpoint.</h2>
        <p>
          This is a browser-only diagnostic. It does not discover devices, scan ports, proxy
          requests, save results, or send requests through VouchNet.
        </p>
      </div>
      <form onSubmit={(event) => void measureEndpoint(event)}>
        <label>
          <span>Loopback endpoint</span>
          <input
            inputMode="url"
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="http://localhost:11434/api/tags"
            value={endpoint}
          />
        </label>
        <button className="secondary" disabled={running} type="submit">
          {running ? 'Measuring…' : 'Measure endpoint'}
        </button>
      </form>
      <div className="local-runtime-benchmark__ollama">
        <label>
          <span>Local Ollama model (optional)</span>
          <input
            onChange={(event) => setModel(event.target.value)}
            placeholder="for example, llama3.2"
            value={model}
          />
        </label>
        <button
          className="secondary"
          disabled={running}
          onClick={() => void measureOllama()}
          type="button"
        >
          Run one short inference
        </button>
      </div>
      {status === null ? null : (
        <p className="local-runtime-benchmark__status" role="status">
          {status}
        </p>
      )}
      {measurement === null ? null : (
        <dl className="local-runtime-benchmark__result">
          <div>
            <dt>Round trip</dt>
            <dd>{measurement.elapsedMs} ms</dd>
          </div>
          <div>
            <dt>HTTP status</dt>
            <dd>{measurement.status}</dd>
          </div>
          <div>
            <dt>Response preview</dt>
            <dd>{measurement.preview || 'No response body'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
