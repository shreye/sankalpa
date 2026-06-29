module.exports = async function handler(req, res) {

  // ── CORS ──────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Validate ──────────────────────────────────────────────
  const { prompt, duration } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'No prompt provided' });
  if (prompt.length > 2000) return res.status(400).json({ error: 'Prompt too long' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server configuration error' });

  const dur = parseInt(duration) || 45;

  // ── Route short flows to Haiku (4x cheaper), long to Sonnet ──
  const model = dur <= 30
    ? 'claude-haiku-4-5-20251001'
    : 'claude-sonnet-4-6';

  // ── Dynamic max_tokens based on duration ──────────────────
  // ~10 tokens per minute of flow is a safe ceiling with buffer
  // Ladder flows are verbose (repeated pose lists every round) — need extra headroom
  const isLadder = (req.body.prompt || '').includes('Ladder');
  const multiplier = isLadder ? 80 : 55;
  const maxTokens = Math.min(8000, Math.max(800, dur * multiplier));

  // ── Tight system prompt — every token costs money ─────────
  const system = `You are a yoga flow creator for @groundingwithshera. Output structured yoga flows a teacher can use immediately.

FORMAT:
- Flow name + one-line style summary
- If theme given: italic opening intention (2-3 sentences) teacher reads aloud
- Phase headers: CENTERING | WARM-UP | PEAK | COOL-DOWN | SAVASANA (add PRANAYAMA after CENTERING and MEDITATION after SAVASANA only if breathwork requested)
- Each phase header: include phase total time
- Each pose: number. **Name (side if applicable)** [counter-pose if applicable] — cue as one flowing sentence that opens with the transition from previous pose
- Static holds only: add (X breaths) or (X min) at end of cue
- Ladder flows: Round 1/2/3 etc. Mark new poses ★. Repeat previous poses as name only, no cue
- Final line: Created by @groundingwithshera

RULES: English pose names only. Realistic bottom-up timings. No filler. No padding. Be concise.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'Could not reach AI — please try again' });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    if (!content) return res.status(502).json({ error: 'Empty response from AI' });

    // ── Log usage for monitoring (visible in Vercel logs) ────
    const usage = data.usage || {};
    console.log(`[Sankalpa] model=${model} dur=${dur}min in=${usage.input_tokens} out=${usage.output_tokens}`);

    return res.status(200).json({ content });

  } catch (err) {
    console.error('Server error:', err.message);
    return res.status(500).json({ error: 'Server error — please try again' });
  }
};
