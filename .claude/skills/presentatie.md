# Presentatie Maken

Maak een professionele HTML presentatie met device mockups.

## Wat heb je nodig?

Geef me de volgende informatie:

1. **Project naam** - Titel van de presentatie
2. **Tagline** - Korte slogan of ondertitel
3. **Slides** - Welke slides wil je? Bijvoorbeeld:
   - Welkom/titel
   - Probleem of uitdaging
   - Oplossing/aanpak
   - Functionaliteiten
   - Demo screenshots
   - Voor wie? (doelgroepen)
   - Roadmap/tijdlijn
   - Contact

4. **Mockups** - Welke device screenshots wil je tonen?
   - iPhone mockups
   - iPad mockups
   - MacBook mockups

5. **Kleuren** - Primaire en secundaire kleur (hex codes)

6. **Logo** - Pad naar logo afbeelding (optioneel)

## Presentatie features

De gegenereerde presentatie bevat:
- Responsive slide layout
- Keyboard navigatie (pijltjestoetsen)
- Device mockup frames (iPhone, iPad, MacBook)
- Material Icons support
- Gradient achtergronden
- Glassmorphism styling
- Slide counter

## Output

De presentatie wordt opgeslagen als `mockups/presentatie.html` en kan direct in de browser geopend worden:

```bash
open mockups/presentatie.html
```

## Stijl opties

**Beschikbare CSS classes:**
- `.problem-card` - Kaarten met icon, titel en beschrijving
- `.feature-card` - Feature cards met icon
- `.check-list` - Checklist items met vinkjes
- `.highlight-box` - Highlight box voor quotes/statements
- `.mockup-iphone` - iPhone device frame
- `.mockup-ipad` - iPad device frame
- `.two-col` - Twee kolommen layout
- `.stat-grid` - Grid voor statistieken

**Material Icons:**
```html
<span class="material-symbols-outlined">icon_name</span>
```
Zoek icons op: https://fonts.google.com/icons
