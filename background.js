const DEFAULT_SETTINGS = {
  provider: 'openai',
  apiKey: '',
  openaiApiKey: '',
  openrouterApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openrouterModel: 'openai/gpt-4o-mini',
  style: 'Jack Kerouac insane'
};

let settings = { ...DEFAULT_SETTINGS };

function migrateSettings(items) {
  const nextSettings = { ...DEFAULT_SETTINGS, ...items };
  const updates = {};

  if (!nextSettings.openaiApiKey && nextSettings.apiKey) {
    nextSettings.openaiApiKey = nextSettings.apiKey;
    updates.openaiApiKey = nextSettings.apiKey;
  }

  return { nextSettings, updates };
}

function syncSettingsFromStorage() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    const { nextSettings, updates } = migrateSettings(items);
    settings = nextSettings;
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates);
    }
  });
}

function updateSettingsCache(changes, areaName) {
  if (areaName !== 'sync') {
    return;
  }

  Object.keys(changes).forEach((key) => {
    settings[key] = changes[key].newValue;
  });

  if (changes.apiKey && !settings.openaiApiKey) {
    settings.openaiApiKey = changes.apiKey.newValue || '';
  }
}

function buildMessages(style, text) {
  return [
    {
      role: 'system',
      content: 'You rewrite text in rich, literary prose while preserving its meaning and facts. Keep the original intent intact, but heighten the language in the requested voice.'
    },
    {
      role: 'user',
      content: `Rewrite the following LinkedIn post in the style of ${style}. Preserve the meaning and key facts, but make the language more vivid and literary. Return only the rewritten post text.\n\n"""${text}"""`
    }
  ];
}

function getOpenRouterReferer() {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      return chrome.runtime.getURL('');
    }
  } catch (error) {
    console.warn('kerouAIc: Failed to build extension referer, using LinkedIn fallback.', error);
  }

  return 'https://www.linkedin.com/';
}

function getProviderConfig() {
  const provider = settings.provider === 'openrouter' ? 'openrouter' : 'openai';

  if (provider === 'openrouter') {
    return {
      provider,
      apiKey: settings.openrouterApiKey || '',
      model: settings.openrouterModel || DEFAULT_SETTINGS.openrouterModel,
      url: 'https://openrouter.ai/api/v1/chat/completions',
      extraHeaders: {
        'HTTP-Referer': getOpenRouterReferer(),
        'X-Title': 'kerouAIc'
      }
    };
  }

  return {
    provider,
    apiKey: settings.openaiApiKey || '',
    model: settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
    url: 'https://api.openai.com/v1/chat/completions',
    extraHeaders: {}
  };
}

async function rewriteText(style, text) {
  const config = getProviderConfig();
  const trimmedText = (text || '').trim();

  if (!trimmedText) {
    return { ok: false, error: 'No text provided.' };
  }

  if (!config.apiKey.trim()) {
    return { ok: false, error: `Missing API key for ${config.provider}.` };
  }

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...config.extraHeaders
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildMessages(style || settings.style || DEFAULT_SETTINGS.style, trimmedText),
        max_tokens: Math.min(2048, Math.max(300, Math.floor(trimmedText.length * 1.5))),
        temperature: 0.8
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const providerError = data && data.error
        ? data.error.message || data.error.code || JSON.stringify(data.error)
        : `HTTP ${response.status}`;
      console.error('kerouAIc: Rewrite request failed', providerError);
      return { ok: false, error: `Request failed: ${providerError}` };
    }

    const rewritten = data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content.trim()
      : '';

    if (!rewritten) {
      console.error('kerouAIc: Unexpected response payload', data);
      return { ok: false, error: 'Provider returned no rewritten text.' };
    }

    return { ok: true, rewritten };
  } catch (error) {
    console.error('kerouAIc: Rewrite request failed', error);
    return { ok: false, error: error && error.message ? error.message : 'Unknown request error.' };
  }
}

syncSettingsFromStorage();
chrome.storage.onChanged.addListener(updateSettingsCache);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || request.action !== 'rewriteText') {
    return undefined;
  }

  rewriteText(request.style, request.text).then((result) => {
    sendResponse(result);
  });

  return true;
});
