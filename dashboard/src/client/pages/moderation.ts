import { getCurrentSettings, saveSettings } from '../main';
import { createToggle, createSelect, createNumberInput, createTagInput, getTagValues } from '../components/inputs';

export function renderModerationPage(container: HTMLElement) {
  const settings = getCurrentSettings();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Moderation Settings</h1>
      <p class="page-description">Configure automated moderation and safety features</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Auto-Moderation</h2>
        <p class="card-description">Automated content filtering</p>
      </div>
      <div class="setting-group" id="automod-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Content Filtering</h2>
        <p class="card-description">Filter inappropriate content and URLs</p>
      </div>
      <div class="setting-group" id="filter-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Punishment Settings</h2>
        <p class="card-description">Configure timeouts and automated actions</p>
      </div>
      <div class="setting-group" id="punishment-settings"></div>
    </div>

    <div class="save-panel">
      <button class="btn btn-success" id="save-moderation">Save Changes</button>
    </div>
  `;

  const automodSettings = document.getElementById('automod-settings')!;
  automodSettings.appendChild(createSelect(
    'Auto-Moderation Level',
    'How aggressive auto-moderation should be',
    'autoModerationLevel',
    settings.autoModerationLevel,
    [
      { value: 'off', label: 'Off' },
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'strict', label: 'Strict' }
    ]
  ));
  automodSettings.appendChild(createToggle(
    'NSFW Filter',
    'Filter not-safe-for-work content',
    'nsfwFilter',
    settings.nsfwFilter
  ));
  automodSettings.appendChild(createToggle(
    'Log Moderation Actions',
    'Log all automated moderation actions',
    'logModerationActions',
    settings.logModerationActions
  ));

  const filterSettings = document.getElementById('filter-settings')!;
  filterSettings.appendChild(createTagInput(
    'URL Blacklist',
    'Blocked URLs or domains',
    'urlBlacklist',
    settings.urlBlacklist || []
  ));
  filterSettings.appendChild(createTagInput(
    'Allowed Domains',
    'Whitelisted domains (leave empty for all)',
    'allowedDomains',
    settings.allowedDomains || []
  ));
  filterSettings.appendChild(createTagInput(
    'Bad Word List',
    'Words to filter (case-insensitive)',
    'badWordList',
    settings.badWordList || []
  ));
  filterSettings.appendChild(createNumberInput(
    'Spam Threshold',
    'Messages per minute to trigger spam detection',
    'spamThreshold',
    settings.spamThreshold,
    1,
    100
  ));

  const punishmentSettings = document.getElementById('punishment-settings')!;
  punishmentSettings.appendChild(createNumberInput(
    'Timeout Duration (mins)',
    'Default timeout duration',
    'timeoutDuration',
    Math.round(settings.timeoutDuration / 60000),
    1
  ));
  punishmentSettings.appendChild(createNumberInput(
    'Strike Decay Days',
    'Days until strikes are removed',
    'strikeDecayDays',
    settings.strikeDecayDays,
    1,
    365
  ));
  punishmentSettings.appendChild(createNumberInput(
    'Auto-Kick Threshold',
    'Strikes before auto-kick (0 = disabled)',
    'autoKickThreshold',
    settings.autoKickThreshold,
    0
  ));
  punishmentSettings.appendChild(createNumberInput(
    'Auto-Ban Threshold',
    'Strikes before auto-ban (0 = disabled)',
    'autoBanThreshold',
    settings.autoBanThreshold,
    0
  ));

  document.getElementById('save-moderation')?.addEventListener('click', () => collectAndSave(container));
}

function collectAndSave(container: HTMLElement) {
  const updates: any = {};
  const timeSettingsInMinutes = ['timeoutDuration'];
  
  container.querySelectorAll('[data-setting]').forEach(element => {
    const key = (element as HTMLElement).dataset.setting!;
    
    if (element.classList.contains('toggle-switch')) {
      updates[key] = element.classList.contains('active');
    } else if (element.classList.contains('tag-input-container')) {
      updates[key] = getTagValues(element as HTMLElement);
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
