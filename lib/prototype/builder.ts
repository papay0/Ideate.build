/**
 * Prototype Builder
 *
 * Combines multiple screens into a single navigable HTML file using CSS :target
 * for pure HTML/CSS navigation without JavaScript.
 */

interface ScreenData {
  name: string;
  html: string;
  isRoot?: boolean;
}

interface PrototypeOptions {
  screens: ScreenData[];
  platform: 'mobile' | 'desktop';
  projectName: string;
}

/**
 * Convert screen name to a valid screen ID for use in URLs
 * "Home Screen" → "screen-home-screen"
 * "User Profile" → "screen-user-profile"
 */
export function toScreenId(name: string): string {
  return 'screen-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Build a complete prototype HTML document from screens
 */
export function buildPrototype(options: PrototypeOptions): string {
  const { screens, platform, projectName } = options;

  if (screens.length === 0) {
    return buildEmptyPrototype(projectName);
  }

  // Find the root screen (default entry point)
  const rootScreen = screens.find(s => s.isRoot) || screens[0];
  const rootScreenId = toScreenId(rootScreen.name);

  // Platform-specific viewport settings
  const viewport = platform === 'mobile'
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 };

  // Build screen sections
  const screenSections = screens.map(screen => {
    const screenId = toScreenId(screen.name);
    const isDefault = screenId === rootScreenId;
    const classes = isDefault ? 'screen screen--default' : 'screen';

    return `  <section id="${screenId}" class="${classes}">
${indentHtml(screen.html, 4)}
  </section>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${viewport.width}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <base target="_self">
  <title>${escapeHtml(projectName)} - Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Reset and base styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${viewport.width}px;
      min-height: ${viewport.height}px;
      overflow-x: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Navigation via CSS :target selector */
    .screen {
      display: none;
      min-height: ${viewport.height}px;
      width: 100%;
    }
    .screen:target { display: block; }

    /* Default screen (ROOT) - shown when no hash in URL */
    .screen--default { display: block; }
    .screen:target ~ .screen--default { display: none; }

    /* Ensure interactive elements work */
    a { cursor: pointer; text-decoration: none; color: inherit; }
    a:hover { opacity: 0.9; }
    button { cursor: pointer; }
    input, textarea, select {
      pointer-events: auto;
      -webkit-appearance: none;
    }

    /* Highlight clickable navigation elements */
    [data-flow] {
      cursor: pointer;
      transition: box-shadow 0.2s ease, transform 0.15s ease;
    }
    [data-flow]:hover {
      box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.5), 0 0 12px rgba(147, 51, 234, 0.3);
      transform: scale(1.01);
    }
    [data-flow]:active {
      transform: scale(0.99);
    }

    /* Scrollable content support */
    .overflow-y-auto { overflow-y: auto; }
    .overflow-y-scroll { overflow-y: scroll; }

    /* Smooth transitions between screens (optional) */
    .screen {
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0.8; }
      to { opacity: 1; }
    }
  </style>
</head>
<body>
${screenSections}
</body>
</html>`;
}

/**
 * Build an empty prototype placeholder
 */
function buildEmptyPrototype(projectName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=390, initial-scale=1.0">
  <title>${escapeHtml(projectName)} - Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-100 flex items-center justify-center">
  <div class="text-center text-gray-500">
    <p class="text-lg">No screens yet</p>
    <p class="text-sm mt-2">Generate some screens to preview your prototype</p>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Indent HTML content for readability
 */
function indentHtml(html: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return html
    .split('\n')
    .map(line => indent + line)
    .join('\n');
}

/**
 * Extract navigation flows from HTML by finding data-flow attributes
 */
export function extractFlowsFromHtml(screenName: string, html: string): Array<{
  from_screen: string;
  to_screen: string;
}> {
  const flows: Array<{ from_screen: string; to_screen: string }> = [];

  // Match all data-flow="screen-xxx" attributes
  const regex = /data-flow="([^"]+)"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    flows.push({
      from_screen: toScreenId(screenName),
      to_screen: match[1], // e.g., "screen-settings"
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  return flows.filter(flow => {
    const key = `${flow.from_screen}:${flow.to_screen}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
