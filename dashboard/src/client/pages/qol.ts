import { getCurrentSettings, saveSettings } from '../main';
import { createToggle, createNumberInput } from '../components/inputs';

export function renderQolPage(container: HTMLElement) {
  const settings = getCurrentSettings();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Quality of Life</h1>
      <p class="page-description">User experience and convenience features</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">User Experience</h2>
        <p class="card-description">Improve user interaction with the bot</p>
      </div>
      <div class="setting-group" id="ux-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Automation</h2>
        <p class="card-description">Automatic updates and maintenance</p>
      </div>
      <div class="setting-group" id="automation-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Data Management</h2>
        <p class="card-description">Control data storage and exports</p>
      </div>
      <div class="setting-group" id="data-settings"></div>
    </div>

    <div class="save-panel">
      <button class="btn btn-success" id="save-qol">Save Changes</button>
    </div>
  `;

  const uxSettings = document.getElementById('ux-settings')!;
  uxSettings.appendChild(createNumberInput(
    'Session Reminder Interval (mins)',
    'How often to remind about active sessions',
    'sessionReminderInterval',
    Math.round(settings.sessionReminderInterval / 60000),
    1
  ));
  uxSettings.appendChild(createToggle(
    'Allow User Presets',
    'Let users save their own setting presets',
    'allowUserPresets',
    settings.allowUserPresets
  ));

  const automationSettings = document.getElementById('automation-settings')!;
  automationSettings.appendChild(createToggle(
    'Auto-Update Plugins',
    'Automatically update plugins when available',
    'autoUpdatePlugins',
    settings.autoUpdatePlugins
  ));

  const dataSettings = document.getElementById('data-settings')!;
  dataSettings.appendChild(createToggle(
    'Cache Screenshots',
    'Cache screenshots to reduce regeneration',
    'cacheScreenshots',
    settings.cacheScreenshots
  ));
  dataSettings.appendChild(createToggle(
    'Allow Browser History Export',
    'Allow users to export browser history',
    'allowBrowserHistoryExport',
    settings.allowBrowserHistoryExport
  ));

  document.getElementById('save-qol')?.addEventListener('click', () => collectAndSave(container));
}

function collectAndSave(container: HTMLElement) {
  const updates: any = {};
  const timeSettingsInMinutes = ['sessionReminderInterval'];
  
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
