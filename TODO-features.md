# Features om te implementeren

## 1. Quiz feature

Interactieve quizronde tijdens een live sessie. Nova wordt quizmaster.

### Flow
1. Rens vraagt om een quiz ("maak een quiz over AI")
2. Nova roept `generate_quiz` aan (achtergrond, fire-and-forget, net als image generation)
3. API `/api/generate-quiz` genereert vragen via Gemini met onderwerp + sessiecontext
4. Stille notificatie als quiz klaar is, Nova gebruikt `quiz_toon_vraag` om eerste vraag te tonen
5. Nova leest vraag voor, bouwt spanning op
6. Rens geeft antwoord → Nova beoordeelt (kent het antwoord uit tool result)
7. Nova roept `quiz_toon_antwoord` aan met `correct=true/false` → animatie op scherm
8. Nova vertelt achtergrondinformatie (background veld) als leuk feitje
9. Nova vraagt of Rens door wil → volgende vraag met `quiz_toon_vraag`
10. Na laatste vraag: score samenvatting, scoreoverzicht verschijnt automatisch

### Tools
- `generate_quiz` — genereert vragen op achtergrond (topic param)
- `quiz_toon_vraag` — toont volgende vraag op scherm
- `quiz_toon_antwoord` — onthult antwoord met correct/incorrect animatie
- `quiz_afsluiten` — sluit quiz af (door Rens, niet Nova)

### Persona-instructies
- Nova is quizmaster: spanning opbouwen, reageren op antwoorden
- NOOIT zelf doorgaan naar volgende vraag zonder bevestiging van Rens
- Na laatste vraag: score samenvatting, NIET zelf quiz_afsluiten aanroepen
- Synoniemen automatisch checken bij beoordeling

### UI Component: QuizDisplay
- Toont vraag met animatie
- Antwoord onthulling met correct/incorrect feedback
- Score bijhouden en tonen
- Scoreoverzicht na afloop

### API: `/api/generate-quiz`
- Input: topic (string), context van sessie
- Output: array van quiz vragen met: question, answer, background (leuk feitje)
- Gebruikt Gemini (`gemini-3-flash-preview`)

### Voorbereiding (prepare-session)
- Quiz vragen kunnen ook voorbereid worden via prepare-session
- questionType "quiz" = kennisvragen met één correct tekstantwoord, geen opties

---

## 2. Context opruimen (context cleanup)

Het gpt-realtime model heeft ~32k token context window. Function call results stapelen op en vullen dit na 3+ poll cycli. Oplossing: actief context beheer.

### Probleem
- Elke poll/open-vraag cyclus kost ~3000 tokens aan function call results
- Na 3+ cycli raakt het context window vol → Nova wordt traag of stopt

### Oplossing: twee-delig

#### A. Compacte function return values
- UI krijgt volledige data via callbacks (onPollResults, onOpenVraagResults, etc.)
- Nova krijgt alleen een korte samenvatting als return string
- Besparing: ~75-85% per function call result, van ~3000 naar ~700 tokens/cyclus

#### B. Automatische context sweep
- Na elke response (als er geen actieve poll/open vraag is): verwijder oude conversation items
- Houd alleen de laatste 4 items (KEEP_RECENT_ITEMS = 4)
- Verwijder items sequentieel met 40ms delay (voorkom rate limiting)
- Pauzeer sweep als er een nieuwe response binnenkomt (activeResponseId check)
- NIET opruimen tijdens actieve poll/open vraag/quiz — Nova moet data behouden

#### C. Session truncation
- Session config: `truncation: { type: "retention_ratio", retention_ratio: 0.6 }`
- Waardes onder 0.6 veroorzaken "Item not found" errors (OpenAI trunceert te agressief)
- Dit is de fallback als onze eigen cleanup niet genoeg is

#### D. Context monitoring
- Console logging met `[Context]` prefix
- Progress bar + percentage van 28k budget
- Cache ratio (hoeveel tokens uit cache komen)
- Per function call: log payload size in chars

### Tracking in UI
- ConversationItem tracking: elk item met id, type, snippet, isLog
- Cleanup logs als UI-only entries (max 3 bewaren)
- TokenDebugPanel component voor live inzicht

### Belangrijk
- `safeParseArgs`: fallback voor truncated JSON wanneer user Nova interrumpt mid-function-call
- Incomplete JSON wordt gefixed door trailing garbage te strippen en haakjes te sluiten

---

## 3. Word cloud / thema's feature

Toont een thematische word cloud van open vraag antwoorden.

### Flow
1. Rens zegt "thema's" / "word cloud" / "patronen" / "clusters"
2. Nova roept `show_word_cloud` aan
3. Client stuurt antwoorden naar `/api/cluster-answers`
4. API clustert antwoorden semantisch met GPT-4o
5. UI toont bubble chart met thema's (grootte = aantal antwoorden)

### Tools
- `show_word_cloud` — geen parameters, gebruikt actieve open vraag data

### API: `/api/cluster-answers`
- Input: answers (string[]), question (string)
- Output: clusters ({ label: string, count: number }[])

### UI Component: WordCloudDisplay
- Bubble/circle packing layout (geen echte word cloud, maar packed circles)
- Grootte proportioneel aan count
- GSAP animatie (scale in met stagger)
- Kleuren: afwisselend #f30349 (rood) en #195969 (teal) tinten

---

## 4. Fix: "analyse"/"analyseer" triggert verkeerde tool

### Probleem
Bij actieve open vraag zegt Rens "analyseer de resultaten" → Nova roept `propose_poll` aan i.p.v. analyse-tool.

### Oplossing in nova-persona.ts
1. "analyse"/"analyseer" toevoegen als triggerwoord bij COMMANDO 2 (deep dive) en COMMANDO 3 (show_summary)
2. Negatieve instructie bij POLLS sectie: "NOOIT propose_poll aanroepen als Rens analyse/analyseer/inzoomen/samenvatting zegt"
3. SAMENGEVAT sectie updaten met analyse/analyseer bij show_summary
