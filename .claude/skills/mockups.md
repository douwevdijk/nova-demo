# Mockups Genereren

Genereer screenshots/mockups van de applicatie voor iPhone, iPad en MacBook.

## Snel starten (dit project)

1. **Start de dev server** op `localhost:3000`:
   ```bash
   npm run dev
   ```

2. **Genereer alle mockups**:
   ```bash
   node generate-all-mockups.cjs
   ```

3. **Bekijk de mockups**:
   ```bash
   open mockups/overview.html
   ```

## Output

Screenshots worden opgeslagen in `mockups/`:
- `mockups/iphone/` - iPhone 15 Pro (393x852 @2x)
- `mockups/ipad/` - iPad Pro 11" Landscape (1194x834 @2x)
- `mockups/macbook/` - MacBook Pro 14" (1512x982 @2x)

## Pagina's configureren

Welke pagina's wil je screenshotten? Geef me:
- De **naam** (voor bestandsnaam)
- Het **URL pad** (bijv. `/dashboard`)
- Of **authenticatie** nodig is (ja/nee)
- Optioneel: **modal** die geopend moet worden

Voorbeeld:
```
- home, /, nee
- dashboard, /dashboard, ja
- profiel, /profile, ja
- settings-modal, /settings, ja, modal: settings
```

---

## Herbruikbaar script voor nieuwe projecten

Er is een template script beschikbaar in `.claude/commands/screenshot-generator.cjs`.

### Setup voor nieuw project

1. **Kopieer het script** naar je project root:
   ```bash
   cp .claude/commands/screenshot-generator.cjs ./generate-mockups.cjs
   ```

2. **Installeer Puppeteer**:
   ```bash
   npm install puppeteer
   ```

3. **Pas de CONFIG sectie aan** in het script:
   ```javascript
   const CONFIG = {
     baseUrl: 'http://localhost:3000',  // Je dev server
     outputDir: './mockups',             // Output folder
     projectName: 'Mijn Project',        // Naam voor overview
     primaryColor: '#f43f5e',            // Accent kleur
   };
   ```

4. **Configureer de pagina's**:
   ```javascript
   const PAGES = [
     { name: 'home', path: '/', needsAuth: false },
     { name: 'dashboard', path: '/dashboard', needsAuth: true },
     { name: 'profile', path: '/profile', needsAuth: true },
     // ...meer pagina's
   ];
   ```

5. **Pas authenticatie aan** (indien nodig):
   ```javascript
   const MOCK_AUTH = {
     setup: async (page) => {
       await page.evaluate(() => {
         localStorage.setItem('auth_token', 'mock_token');
       });
     },
     clear: async (page) => {
       await page.evaluate(() => {
         localStorage.removeItem('auth_token');
       });
     }
   };
   ```

6. **Run het script**:
   ```bash
   node generate-mockups.cjs
   ```

### Geavanceerde opties

**Modal screenshots:**
```javascript
{ name: 'settings-modal', path: '/dashboard', needsAuth: true, openModal: 'settings' }
```

**Wachten op element:**
```javascript
{ name: 'data-loaded', path: '/dashboard', needsAuth: true, waitFor: '.data-table' }
```

**Scrollen naar element:**
```javascript
{ name: 'footer', path: '/', needsAuth: false, scrollTo: 'footer' }
```

### Vereisten

- Node.js 18+
- Puppeteer (`npm install puppeteer`)
- Google Chrome op `/Applications/Google Chrome.app` (macOS)
- Dev server draaiend

### Chrome path voor andere OS

```javascript
// Windows
chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

// Linux
chromePath: '/usr/bin/google-chrome'
```
