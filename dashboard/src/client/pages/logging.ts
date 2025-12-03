import { getCurrentSettings, saveSettings } from '../main';
import { createToggle, createNumberInput, createTextInput } from '../components/inputs';

export function renderLoggingPage(container: HTMLElement) {
  const settings = getCurrentSettings();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Logging & Alerts</h1>
      <p class="page-description">Configure logging, notifications, and alerts</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Log Channels</h2>
        <p class="card-description">Where to send log messages</p>
      </div>
      <div class="setting-group" id="channel-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Webhooks</h2>
        <p class="card-description">Configure webhook notifications</p>
      </div>
      <div class="setting-group" id="webhook-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Notifications</h2>
        <p class="card-description">Control when to send notifications</p>
      </div>
      <div class="setting-group" id="notification-settings"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Metrics</h2>
        <p class="card-description">Performance and usage metrics</p>
      </div>
      <div class="setting-group" id="metrics-settings"></div>
    </div>

    <div class="save-panel">
      <button class="btn btn-success" id="save-logging">Save Changes</button>
    </div>
  `;

  const channelSettings = document.getElementById('channel-settings')!;
  channelSettings.appendChild(createTextInput(
    'Log Channel ID',
    'Channel ID for general logs',
    'logChannelID',
    settings.logChannelID || ''
  ));
  channelSettings.appendChild(createTextInput(
    'Metrics Channel ID',
    'Channel ID for metrics and stats',
    'metricsChannelID',
    settings.metricsChannelID || ''
  ));

  const webhookSettings = document.getElementById('webhook-settings')!;
  webhookSettings.appendChild(createTextInput(
    'Alert Webhook URL',
    'Webhook for important alerts',
    'alertWebhookURL',
    settings.alertWebhookURL || ''
  ));
  webhookSettings.appendChild(createTextInput(
    'Error Webhook URL',
    'Webhook for error notifications',
    'errorWebhookURL',
    settings.errorWebhookURL || ''
  ));

  const notificationSettings = document.getElementById('notification-settings')!;
  notificationSettings.appendChild(createToggle(
    'DM Owner on Flags',
    'Send DM to server owner on flagged content',
    'dmOwnerOnFlags',
    settings.dmOwnerOnFlags
  ));
  notificationSettings.appendChild(createToggle(
    'Report Browser Switch',
    'Notify when browser type is changed',
    'reportOnBrowserSwitch',
    settings.reportOnBrowserSwitch
  ));
  notificationSettings.appendChild(createToggle(
    'Notify on Session Start',
    'Send notification when session starts',
    'notifyOnSessionStart',
    settings.notifyOnSessionStart
  ));
  notificationSettings.appendChild(createToggle(
    'Notify on Session End',
    'Send notification when session ends',
    'notifyOnSessionEnd',
    settings.notifyOnSessionEnd
  ));

  const metricsSettings = document.getElementById('metrics-settings')!;
  metricsSettings.appendChild(createNumberInput(
    'Metrics Interval (mins)',
    'How often to collect metrics',
    'metricsInterval',
    Math.round(settings.metricsInterval / 60000),
    1
  ));

  document.getElementById('save-logging')?.addEventListener('click', () => collectAndSave(container));
}

function collectAndSave(container: HTMLElement) {
  const updates: any = {};
  const timeSettingsInMinutes = ['metricsInterval'];
  
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
