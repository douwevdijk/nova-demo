/**
 * Screenshot Generator - Herbruikbaar script voor mockup generatie
 *
 * Gebruik:
 *   node screenshot-generator.cjs
 *
 * Configuratie:
 *   Pas de CONFIG sectie hieronder aan voor je project
 *
 * Vereisten:
 *   - Node.js
 *   - Puppeteer: npm install puppeteer
 *   - Google Chrome geinstalleerd
 *   - Dev server draaiend (standaard localhost:3000)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATIE - PAS DIT AAN VOOR JE PROJECT
// ============================================================================

const CONFIG = {
  // Base URL van je dev server
  baseUrl: 'http://localhost:3000',

  // Output directory voor screenshots
  outputDir: './mockups',

  // Chrome executable path (macOS standaard)
  chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

  // Project naam voor overview pagina
  projectName: 'Mijn Project',
  projectSubtitle: 'Alle schermen op iPhone, iPad en MacBook',

  // Logo pad voor overview pagina (optioneel)
  logoPath: '../public/images/brand/logo-icon-only.png',

  // Primaire kleur voor styling
  primaryColor: '#f43f5e',
};

// Device configuraties
const DEVICES = {
  iphone: {
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    scale: 2,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  ipad: {
    name: 'iPad Pro 11" (Landscape)',
    width: 1194,
    height: 834,
    scale: 2,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  macbook: {
    name: 'MacBook Pro 14"',
    width: 1512,
    height: 982,
    scale: 2,
    isMobile: false,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  }
};

// Pagina's om te screenshotten
// - name: bestandsnaam (zonder .png)
// - path: URL pad
// - needsAuth: of authenticatie nodig is
// - openModal: optionele modal om te openen (custom functie in openModal)
// - waitFor: optionele selector om op te wachten
// - scrollTo: optioneel element om naartoe te scrollen
const PAGES = [
  { name: 'home', path: '/', needsAuth: false },
  { name: 'dashboard', path: '/dashboard', needsAuth: true },
  // Voeg hier meer pagina's toe...
];

// Mock authenticatie data (pas aan voor je project)
const MOCK_AUTH = {
  // localStorage keys en values voor authenticatie
  setup: async (page) => {
    await page.evaluate(() => {
      // Voorbeeld: mock Firebase auth
      const mockUser = {
        uid: 'mock_user_123',
        email: 'user@example.com'
      };
      localStorage.setItem('mock_firebase_user', JSON.stringify(mockUser));

      // Voeg hier extra localStorage items toe indien nodig
    });
  },
  clear: async (page) => {
    await page.evaluate(() => {
      localStorage.removeItem('mock_firebase_user');
      // Verwijder hier extra items indien nodig
    });
  }
};

// ============================================================================
// SCREENSHOT GENERATOR - NIET AANPASSEN TENZIJ NODIG
// ============================================================================

async function generateScreenshots() {
  console.log('🚀 Starting screenshot generation...\n');

  // Maak output directories
  const outputDir = path.resolve(CONFIG.outputDir);
  Object.keys(DEVICES).forEach(device => {
    const deviceDir = path.join(outputDir, device);
    if (!fs.existsSync(deviceDir)) {
      fs.mkdirSync(deviceDir, { recursive: true });
    }
  });

  // Start browser
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CONFIG.chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Genereer screenshots per device
  for (const [deviceKey, device] of Object.entries(DEVICES)) {
    console.log(`\n📱 ${device.name}...\n`);

    const page = await browser.newPage();

    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: device.scale,
      isMobile: device.isMobile,
      hasTouch: device.isMobile
    });

    await page.setUserAgent(device.userAgent);

    const deviceDir = path.join(outputDir, deviceKey);

    for (const pageConfig of PAGES) {
      console.log(`   📸 ${pageConfig.name}...`);

      try {
        // Ga eerst naar base URL
        await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle0' });

        // Setup of clear auth
        if (pageConfig.needsAuth) {
          await MOCK_AUTH.setup(page);
        } else {
          await MOCK_AUTH.clear(page);
        }

        // Navigeer naar pagina
        await page.goto(`${CONFIG.baseUrl}${pageConfig.path}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wacht op pagina laden
        await new Promise(r => setTimeout(r, 2000));

        // Wacht op specifieke selector indien opgegeven
        if (pageConfig.waitFor) {
          await page.waitForSelector(pageConfig.waitFor, { timeout: 5000 });
        }

        // Open modal indien opgegeven
        if (pageConfig.openModal) {
          await openModal(page, pageConfig.openModal);
          await new Promise(r => setTimeout(r, 1500));
        }

        // Scroll naar element indien opgegeven
        if (pageConfig.scrollTo) {
          await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
          }, pageConfig.scrollTo);
        } else {
          // Anders scroll naar top
          await page.evaluate(() => window.scrollTo(0, 0));
        }

        await new Promise(r => setTimeout(r, 500));

        // Maak screenshot
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: false
        });

        const screenshotPath = path.join(deviceDir, `${pageConfig.name}.png`);
        fs.writeFileSync(screenshotPath, screenshot);
        console.log(`      ✅ Saved`);

        // Sluit modal indien geopend
        if (pageConfig.openModal) {
          await page.keyboard.press('Escape');
          await new Promise(r => setTimeout(r, 500));
        }

      } catch (error) {
        console.error(`      ❌ Error: ${error.message}`);
      }
    }

    await page.close();
  }

  await browser.close();

  // Genereer overview HTML
  const overviewHTML = generateOverviewHTML();
  fs.writeFileSync(path.join(outputDir, 'overview.html'), overviewHTML);
  console.log(`\n📄 Overview: ${path.join(outputDir, 'overview.html')}`);

  console.log('\n✨ Done!\n');
}

// Custom modal opener - pas aan voor je project
async function openModal(page, modalType) {
  switch (modalType) {
    case 'example':
      await page.evaluate(() => {
        // Klik op een element om modal te openen
        const btn = document.querySelector('[data-modal="example"]');
        if (btn) btn.click();
      });
      break;
    // Voeg meer modal types toe...
    default:
      console.log(`      Unknown modal type: ${modalType}`);
  }
}

// Overview HTML generator
function generateOverviewHTML() {
  const primaryColor = CONFIG.primaryColor;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${CONFIG.projectName} - Device Mockups</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: linear-gradient(180deg, #fffbf7 0%, #fff5f0 50%, #ffffff 100%);
      min-height: 100vh;
      color: #1f2937;
    }
    .container {
      max-width: 1800px;
      margin: 0 auto;
      padding: 60px 40px;
    }
    header {
      text-align: center;
      margin-bottom: 60px;
    }
    h1 {
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .subtitle {
      font-size: 18px;
      color: #6b7280;
    }
    .device-section {
      margin-bottom: 80px;
    }
    .device-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 32px;
      text-align: center;
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 32px;
    }
    .mockup-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .iphone-frame {
      width: 260px;
      height: 532px;
      background: linear-gradient(145deg, #1c1c1e, #2c2c2e);
      border-radius: 44px;
      padding: 12px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .iphone-screen {
      width: 100%;
      height: 100%;
      background: #000;
      border-radius: 36px;
      overflow: hidden;
      position: relative;
    }
    .iphone-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
    }
    .dynamic-island {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 84px;
      height: 24px;
      background: #000;
      border-radius: 12px;
      z-index: 10;
    }
    .ipad-frame {
      width: 720px;
      height: 504px;
      background: linear-gradient(145deg, #1c1c1e, #2c2c2e);
      border-radius: 24px;
      padding: 16px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .ipad-screen {
      width: 100%;
      height: 100%;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
    }
    .ipad-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
    }
    .macbook-frame {
      background: linear-gradient(145deg, #1c1c1e, #2c2c2e);
      border-radius: 16px 16px 0 0;
      padding: 12px 12px 0 12px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .macbook-screen {
      width: 760px;
      height: 475px;
      background: #000;
      border-radius: 8px 8px 0 0;
      overflow: hidden;
      position: relative;
    }
    .macbook-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
    }
    .macbook-notch {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 160px;
      height: 22px;
      background: #000;
      border-radius: 0 0 10px 10px;
    }
    .macbook-base {
      width: 840px;
      height: 14px;
      background: linear-gradient(180deg, #3a3a3c, #2c2c2e);
      border-radius: 0 0 6px 6px;
    }
    .macbook-bottom {
      width: 920px;
      height: 6px;
      background: linear-gradient(180deg, #48484a, #3a3a3c);
      border-radius: 0 0 10px 10px;
      margin-top: -1px;
    }
    .page-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      background: rgba(255,255,255,0.8);
      padding: 6px 16px;
      border-radius: 100px;
      border: 1px solid ${primaryColor}20;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${CONFIG.projectName}</h1>
      <p class="subtitle">${CONFIG.projectSubtitle}</p>
    </header>

    <section class="device-section">
      <h2 class="device-title">iPhone</h2>
      <div class="grid">
        ${PAGES.map(p => `
        <div class="mockup-item">
          <div class="iphone-frame">
            <div class="iphone-screen">
              <div class="dynamic-island"></div>
              <img src="iphone/${p.name}.png" alt="${p.name}">
            </div>
          </div>
          <div class="page-label">${p.name}</div>
        </div>
        `).join('')}
      </div>
    </section>

    <section class="device-section">
      <h2 class="device-title">iPad</h2>
      <div class="grid" style="flex-direction: column; align-items: center;">
        ${PAGES.map(p => `
        <div class="mockup-item">
          <div class="ipad-frame">
            <div class="ipad-screen">
              <img src="ipad/${p.name}.png" alt="${p.name}">
            </div>
          </div>
          <div class="page-label">${p.name}</div>
        </div>
        `).join('')}
      </div>
    </section>

    <section class="device-section">
      <h2 class="device-title">MacBook</h2>
      <div class="grid" style="flex-direction: column; align-items: center;">
        ${PAGES.map(p => `
        <div class="mockup-item">
          <div class="macbook-frame">
            <div class="macbook-screen">
              <div class="macbook-notch"></div>
              <img src="macbook/${p.name}.png" alt="${p.name}">
            </div>
          </div>
          <div class="macbook-base"></div>
          <div class="macbook-bottom"></div>
          <div class="page-label">${p.name}</div>
        </div>
        `).join('')}
      </div>
    </section>
  </div>
</body>
</html>`;
}

// Run
generateScreenshots().catch(console.error);
