const DEFAULT_STYLE = 'Jack Kerouac insane';
const BUTTON_CLASS = 'kerouaic-rewrite-button';
const FALLBACK_ACTION_CLASS = 'kerouaic-fallback-actions';
const BUTTON_TEXT = {
  idle: 'kerouAIc this',
  loading: 'kerouAIc-ing...',
  success: 'kerouAIc-ed',
  error: 'Try again'
};

const TEXT_SELECTORS = [
  '[data-testid="expandable-text-box"]',
  '.update-components-text',
  '.feed-shared-update-v2__description',
  '.feed-shared-text',
  '.feed-shared-inline-show-more-text',
  '.attributed-text-segment-list__container',
  '[data-test-id="main-feed-activity-card__commentary"]'
];

const ACTION_ROW_SELECTORS = [
  '.feed-shared-social-action-bar',
  '.feed-shared-social-actions',
  '.update-v2-social-actions'
];

const ACTION_LABELS = ['like', 'comment', 'repost', 'send', 'share'];
const POST_ROOT_SELECTORS = 'article, [data-id^="urn:li:activity:"]';

let currentStyle = DEFAULT_STYLE;

function loadStyle() {
  chrome.storage.sync.get({ style: DEFAULT_STYLE }, (items) => {
    currentStyle = items.style || DEFAULT_STYLE;
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.style) {
    currentStyle = changes.style.newValue || DEFAULT_STYLE;
  }
});

function injectStyles() {
  if (document.getElementById('kerouaic-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'kerouaic-styles';
  style.textContent = `
    .${BUTTON_CLASS} {
      appearance: none;
      border: 0;
      border-radius: 999px;
      background: #111111;
      color: #f6e7c1;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      text-transform: uppercase;
      margin-left: 8px;
      margin-top: 10px;
      margin-bottom: 10px;
    }

    .${BUTTON_CLASS}[disabled] {
      opacity: 0.7;
      cursor: wait;
    }

    .${BUTTON_CLASS}[data-state="success"] {
      background: #0a7d34;
      color: #ffffff;
    }

    .${BUTTON_CLASS}[data-state="error"] {
      background: #b42318;
      color: #ffffff;
    }

    .${FALLBACK_ACTION_CLASS} {
      display: flex;
      justify-content: flex-start;
      margin-top: 12px;
    }
  `;
  document.head.appendChild(style);
}

function getElementText(element) {
  return ((element && (element.innerText || element.textContent)) || '').replace(/\s+/g, ' ').trim();
}

function isEditable(element) {
  return !!element && (element.isContentEditable || !!element.closest('[contenteditable="true"], textarea, input'));
}

function hasMeaningfulText(element) {
  if (!element || isEditable(element)) {
    return false;
  }

  return getElementText(element).length >= 20;
}

function getActionLabelMatches(container) {
  const matches = new Set();
  if (!container || typeof container.querySelectorAll !== 'function') {
    return matches;
  }

  container.querySelectorAll('button, a').forEach((control) => {
    const label = `${control.getAttribute('aria-label') || ''} ${getElementText(control)}`.toLowerCase();
    ACTION_LABELS.forEach((action) => {
      if (label.includes(action)) {
        matches.add(action);
      }
    });
  });

  return matches;
}

function isLikelyActionContainer(container) {
  return getActionLabelMatches(container).size >= 3;
}

function findActionContainer(post) {
  if (!post || typeof post.querySelector !== 'function') {
    return null;
  }

  for (const selector of ACTION_ROW_SELECTORS) {
    const candidate = post.querySelector(selector);
    if (candidate) {
      return candidate;
    }
  }

  const controls = Array.from(post.querySelectorAll('button, a'));
  for (const control of controls) {
    let current = control.parentElement;
    while (current && current !== post) {
      if (isLikelyActionContainer(current)) {
        return current;
      }
      current = current.parentElement;
    }
  }

  return null;
}

function findPrimaryTextContainer(post) {
  if (!post || typeof post.querySelectorAll !== 'function') {
    return null;
  }

  for (const selector of TEXT_SELECTORS) {
    const candidates = Array.from(post.querySelectorAll(selector));
    for (const candidate of candidates) {
      if (hasMeaningfulText(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function findPostRoot(textContainer) {
  if (!textContainer) {
    return null;
  }

  const explicitRoot = textContainer.closest(POST_ROOT_SELECTORS);
  if (explicitRoot) {
    return explicitRoot;
  }

  let current = textContainer.parentElement;
  let depth = 0;
  while (current && current !== document.body && depth < 15) {
    if (findActionContainer(current)) {
      return current;
    }
    current = current.parentElement;
    depth += 1;
  }

  return textContainer.closest('[componentkey]') || textContainer.parentElement;
}

function setButtonState(button, state) {
  button.dataset.state = state;
  button.disabled = state === 'loading';
  if (state === 'success') {
    button.textContent = BUTTON_TEXT.success;
    return;
  }
  if (state === 'error') {
    button.textContent = BUTTON_TEXT.error;
    return;
  }
  if (state === 'loading') {
    button.textContent = BUTTON_TEXT.loading;
    return;
  }
  button.textContent = BUTTON_TEXT.idle;
}

function injectButton(post, textContainer) {
  if (post.querySelector(`.${BUTTON_CLASS}`)) {
    return;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASS;
  button.dataset.kerouaicButton = 'true';
  setButtonState(button, 'idle');

  button.addEventListener('click', () => {
    const originalText = getElementText(textContainer);
    if (!originalText) {
      setButtonState(button, 'error');
      return;
    }

    setButtonState(button, 'loading');

    chrome.runtime.sendMessage(
      {
        action: 'rewriteText',
        text: originalText,
        style: currentStyle,
        source: 'linkedin-post'
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('kerouAIc: message failed', chrome.runtime.lastError);
          setButtonState(button, 'error');
          return;
        }

        if (!response || !response.ok || !response.rewritten) {
          console.error('kerouAIc: rewrite failed', response && response.error ? response.error : 'Unknown error');
          setButtonState(button, 'error');
          return;
        }

        textContainer.innerText = response.rewritten;
        post.dataset.kerouaicRewritten = 'true';
        setButtonState(button, 'success');
        window.setTimeout(() => setButtonState(button, 'idle'), 2500);
      }
    );
  });

  const actionContainer = findActionContainer(post);
  if (actionContainer) {
    actionContainer.appendChild(button);
    return;
  }

  const anchor = textContainer.closest('p, div') || textContainer;
  const fallbackRow = document.createElement('div');
  fallbackRow.className = FALLBACK_ACTION_CLASS;
  fallbackRow.appendChild(button);
  anchor.insertAdjacentElement('afterend', fallbackRow);
}

function findTextContainers(root = document) {
  const candidates = new Set();

  if (root.nodeType === Node.ELEMENT_NODE && typeof root.matches === 'function') {
    TEXT_SELECTORS.forEach((selector) => {
      if (root.matches(selector)) {
        candidates.add(root);
      }
    });
  }

  if (typeof root.querySelectorAll === 'function') {
    TEXT_SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach((candidate) => {
        candidates.add(candidate);
      });
    });
  }

  return Array.from(candidates).filter((candidate) => hasMeaningfulText(candidate));
}

function processTextContainer(textContainer) {
  if (!textContainer || textContainer.closest(`.${FALLBACK_ACTION_CLASS}`)) {
    return;
  }

  const post = findPostRoot(textContainer);
  if (!post || post.querySelector(`.${BUTTON_CLASS}`)) {
    return;
  }

  const primaryTextContainer = findPrimaryTextContainer(post);
  if (primaryTextContainer !== textContainer) {
    return;
  }

  injectButton(post, textContainer);
}

function scanForPosts(root = document) {
  findTextContainers(root).forEach((textContainer) => {
    processTextContainer(textContainer);
  });
}

function startObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanForPosts(node);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function init() {
  if (!chrome.runtime || !chrome.runtime.id) {
    return;
  }

  injectStyles();
  loadStyle();
  scanForPosts(document);
  startObserver();
}

if (window.location.hostname === 'www.linkedin.com') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
