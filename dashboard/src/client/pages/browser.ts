import { getCurrentSettings, saveSettings } from '../main';
import { createToggle, createNumberInput, createTextInput } from '../components/inputs';

export function renderBrowserPage(container: HTMLElement) {
  const settings = getCurrentSettings();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Browser Automation</h1>
      <p class="page-description">Configure browser behavior and performance</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Performance</h2>
        <p class="card-description">Optimize browser performance</p>
      </div>
      <div class="setting-group" id="performance-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Session Management</h2>
        <p class="card-description">Control browser session behavior</p>
      </div>
      <div class="setting-group" id="session-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Browser Features</h2>
        <p class="card-description">Enable or disable browser capabilities</p>
      </div>
      <div class="setting-group" id="feature-settings"></div>
    </div>

    <div class="save-panel">
      <button class="btn btn-success" id="save-browser">Save Changes</button>
    </div>
  `;

  const performanceSettings = document.getElementById('performance-settings')!;
  performanceSettings.appendChild(createToggle(
    'Performance Mode',
    'Reduce resource usage (may affect quality)',
    'performanceMode',
    settings.performanceMode
  ));
  performanceSettings.appendChild(createNumberInput(
    'Screenshot Quality',
    'JPEG quality for screenshots (1-100)',
    'screenshotQuality',
    settings.screenshotQuality,
    1,
    100
  ));
  performanceSettings.appendChild(createNumberInput(
    'Mouse Sensitivity',
    'Mouse movement sensitivity (1-100)',
    'mouseSensitivity',
    settings.mouseSensitivity,
    1,
    100
  ));
  performanceSettings.appendChild(createNumberInput(
    'Max Concurrent Sessions',
    'Maximum simultaneous browser sessions',
    'maxConcurrentSessions',
    settings.maxConcurrentSessions,
    1,
    10
  ));

  const sessionSettings = document.getElementById('session-settings')!;
  sessionSettings.appendChild(createNumberInput(
    'Max Session Duration (mins)',
    'Maximum time for a single session',
    'maxSessionDuration',
    Math.round(settings.maxSessionDuration / 60000),
    1,
    60
  ));
  sessionSettings.appendChild(createToggle(
    'Auto-Close Browser',
    'Automatically close browser after session',
    'autoCloseBrowser',
    settings.autoCloseBrowser
  ));
  sessionSettings.appendChild(createToggle(
    'Persistent Cookies',
    'Save cookies between sessions',
    'persistentCookies',
    settings.persistentCookies
  ));
  sessionSettings.appendChild(createTextInput(
    'Custom Homepage',
    'Default homepage URL (leave empty for default)',
    'customHomepage',
    settings.customHomepage || ''
  ));

  const featureSettings = document.getElementById('feature-settings')!;
  featureSettings.appendChild(createToggle(
    'Allow File Downloads',
    'Enable file downloads in browser',
    'allowFileDownloads',
    settings.allowFileDownloads
  ));
  featureSettings.appendChild(createToggle(
    'Enable Clipboard Sync',
    'Sync clipboard between browser and Discord',
    'enableClipboardSync',
    settings.enableClipboardSync
  ));
  featureSettings.appendChild(createToggle(
    'Enable Keyboard Shortcuts',
    'Allow keyboard shortcuts in browser',
    'enableKeyboardShortcuts',
    settings.enableKeyboardShortcuts
  ));

  document.getElementById('save-browser')?.addEventListener('click', () => collectAndSave(container));
}

function collectAndSave(container: HTMLElement) {
  const updates: any = {};
  const timeSettingsInMinutes = ['maxSessionDuration'];
  
  container.querySelectorAll('[data-setting]').forEach(element => {
    const key = (element as HTMLElement).dataset.setting!;
    
    if (element.classList.contains('toggle-switch')) {
      updates[key] = element.classList.contains('active');
    } else if (element instanceof HTMLSelectElement || element instanceof HTMLInputElement) {
      const value = element.value;
      let numValue = element.type === 'number' ? Number(value) : value;
      if (timeSettingsInMinutes.includes(key) && typeof numValue === 'number') {
        numValue = numValue * 60000;
      }
      updates[key] = numValue;
    }
  });

  saveSettings(updates);
}
