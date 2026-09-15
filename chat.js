// Cloudflare Pages Function — powers "AI mode" in the Cat Concierge widget.
//
// Cloudflare auto-routes this file to the path /chat because it lives at
// functions/chat.js in the project root (not inside index.html's folder
// structure — see the setup notes below).
//
// This runs on Cloudflare's servers, not in the browser, so it's the only
// safe place to hold your Anthropic API key. Never put the API key in
// index.html or any client-side code.
//
// SETUP:
//   1. Get an API key from https://console.anthropic.com
//   2. In your Cloudflare Pages project: Settings → Environment variables →
//      add ANTHROPIC_API_KEY (as a "Secret", not plain text) with your key.
//   3. Redeploy — Cloudflare picks up files under /functions automatically,
//      no extra config needed for a basic setup like this.

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured. Add it in Cloudflare Pages → Settings → Environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let userMessage;
  try {
    const body = await request.json();
    userMessage = (body.message || '').toString().slice(0, 500);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!userMessage) {
    return new Response(JSON.stringify({ error: 'Missing "message" in request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:
          'You are the Cat Concierge for PonsCats, a playful cat-themed memecoin ' +
          'directory site. Answer briefly and warmly, in a fun cat-loving tone. ' +
          'Never give financial advice, never confirm any contract address is safe ' +
          'to buy, and always remind people to verify contract addresses from ' +
          'official sources before buying. If asked about something unrelated to ' +
          'the site or cats, gently redirect back to PonsCats topics.',
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const reply = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return new Response(
      JSON.stringify({ reply: reply || "Meow — I didn't quite catch that." }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
