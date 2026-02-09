# Skill: Fetch OpenAI Documentation

## Wanneer te gebruiken

Als je OpenAI documentatie nodig hebt en WebFetch geblokkeerd wordt door robots.txt.

## Gebruik

```bash
node scripts/fetch-url.js "URL"
```

## Handige OpenAI docs URLs

### Realtime API

- Server events: `https://platform.openai.com/docs/api-reference/realtime-server-events`
- Client events: `https://platform.openai.com/docs/api-reference/realtime-client-events`
- Guide: `https://platform.openai.com/docs/guides/realtime`
- Conversations: `https://platform.openai.com/docs/guides/realtime-conversations`
- VAD: `https://platform.openai.com/docs/guides/realtime-vad`
- WebRTC: `https://platform.openai.com/docs/guides/realtime-webrtc`

### Voorbeelden

```bash
# Fetch Realtime server events documentatie
node scripts/fetch-url.js "https://platform.openai.com/docs/api-reference/realtime-server-events"Wil ik ook bij de wordcloud uitraten hè? En nog een ding. Als je de poll start wil ik eerst de opties zien. Klopt dat?

# Fetch Realtime guide
node scripts/fetch-url.js "https://platform.openai.com/docs/guides/realtime"
```

## Output

Het script converteert HTML naar leesbare tekst en print naar stdout.
