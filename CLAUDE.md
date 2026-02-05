# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nova Demo is a real-time AI-powered interactive presentation platform. It enables live audience interaction through polls and open-ended questions (open vragen) with AI-driven analysis and voice interaction.

**Language:** The application UI and all AI prompts are in Dutch (nl-NL).

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Run production server
```

No test framework is configured.

## Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY` - For Realtime API, GPT-4o, and web search
- `GEMINI_API_KEY` - For image generation

## Architecture

### Tech Stack
- Next.js 16 with App Router (React 19, TypeScript 5)
- Tailwind CSS 4 for styling
- GSAP for animations
- Firebase Realtime Database for live data
- OpenAI Realtime API (WebRTC) for voice interaction
- Google Gemini for image generation

### Key Components

**`src/components/NovaConversation.tsx`** - Main orchestrator (850+ lines). Manages WebRTC connection, handles Nova's function calls, and coordinates all display components.

**`src/lib/realtime-client.ts`** - WebRTC client for OpenAI Realtime API (1879 lines). Handles audio streaming, connection state, and function call execution.

**`src/lib/nova-persona.ts`** - AI prompt engineering and tool definitions. Defines Nova's personality and 11 available tools (polls, open vragen, analysis, images, web search).

**`src/lib/question-manager.ts`** - Bridges Firebase data with UI via listener pattern.

**`src/lib/firebase.ts`** - Firebase configuration and CRUD operations.

### Data Flow

1. Nova (AI) receives voice input via WebRTC
2. Nova calls tools defined in `nova-persona.ts`
3. `RealtimeClient` executes functions and returns results
4. Firebase stores/retrieves poll responses and open vraag answers
5. Display components render results with GSAP animations

### Firebase Structure

```
nova-vote/campaigns/{campaignId}/questions/{questionId}
```

### API Routes

All in `src/app/api/`:
- `session/` - Creates OpenAI Realtime tokens
- `web-search/` - GPT-4o web search
- `generate-image/` - Gemini image generation
- `poll/start/` and `poll/results/` - Poll management

## Conventions

- Components: PascalCase files in `src/components/`
- Utilities: lowercase/kebab-case in `src/lib/`
- Path alias: `@/*` maps to `./src/*`
- Colors: Primary `#195969` (teal), Secondary `#f30349` (red)
