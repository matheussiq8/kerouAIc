const DEFAULTS = {
  provider: 'openai',
  apiKey: '',
  openaiApiKey: '',
  openrouterApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openrouterModel: 'openai/gpt-4o-mini',
  style: 'Jack Kerouac insane'
};

const MODEL_PRESETS = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  openrouter: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet']
};

function migrateSettings(items) {
  const nextSettings = { ...DEFAULTS, ...items };

  if (!nextSettings.openaiApiKey && nextSettings.apiKey) {
    nextSettings.openaiApiKey = nextSettings.apiKey;
  }

  return nextSettings;
}

function populateModelSelect(select, models, selectedValue) {
  select.textContent = '';

  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    if (model === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  if (!models.includes(selectedValue)) {
    select.value = models[0];
  }
}

function updateVisibleProviderFields() {
  const provider = document.getElementById('provider').value;
  const openAiGroup = document.getElementById('openai-settings');
  const openRouterGroup = document.getElementById('openrouter-settings');

  openAiGroup.hidden = provider !== 'openai';
  openRouterGroup.hidden = provider !== 'openrouter';
}

function restoreOptions() {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    const settings = migrateSettings(items);

    document.getElementById('provider').value = settings.provider;
    document.getElementById('openai-api-key').value = settings.openaiApiKey;
    document.getElementById('openrouter-api-key').value = settings.openrouterApiKey;
    document.getElementById('style').value = settings.style;

    populateModelSelect(
      document.getElementById('openai-model'),
      MODEL_PRESETS.openai,
      settings.openaiModel
    );
    populateModelSelect(
      document.getElementById('openrouter-model'),
      MODEL_PRESETS.openrouter,
      settings.openrouterModel
    );

    updateVisibleProviderFields();

    if (!items.openaiApiKey && items.apiKey) {
      chrome.storage.sync.set({ openaiApiKey: items.apiKey });
    }
  });
}

function saveOptions(event) {
  event.preventDefault();

  const payload = {
    provider: document.getElementById('provider').value,
    openaiApiKey: document.getElementById('openai-api-key').value.trim(),
    openrouterApiKey: document.getElementById('openrouter-api-key').value.trim(),
    openaiModel: document.getElementById('openai-model').value,
    openrouterModel: document.getElementById('openrouter-model').value,
    style: document.getElementById('style').value
  };

  chrome.storage.sync.set(payload, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved.';
    window.setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  document.getElementById('provider').addEventListener('change', updateVisibleProviderFields);
  document.getElementById('options-form').addEventListener('submit', saveOptions);
});
