# kerouAIc

`kerouAIc` is a Chrome extension that adds a `kerouAIc this` button to LinkedIn feed posts and rewrites the selected post in a more literary voice.

It supports:
- OpenAI
- OpenRouter
- Provider-specific model selection
- A configurable rewrite voice in the extension options

## What It Does

When the extension is enabled on LinkedIn:
- it adds a `kerouAIc this` button to feed posts,
- it sends the post text to your chosen AI provider,
- it rewrites the post in place on the page,
- it does not post anything back to LinkedIn,
- it only changes the visible text in your browser.

## Files In This Repo

- `manifest.json`: Chrome extension manifest
- `background.js`: provider routing and API calls
- `content.js`: LinkedIn button injection and in-page rewrite behavior
- `options.html` and `options.js`: settings UI
- `kerouAIc_extension.zip`: packaged extension source for easy extraction

## Install

### Option 1: Load the repo folder directly

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the project folder that contains `manifest.json`.

### Option 2: Install from the packaged zip

1. Download `kerouAIc_extension.zip`.
2. Extract it to a normal folder.
3. Open Chrome and go to `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the extracted folder.

Note: Chrome does not load `.zip` files directly as unpacked extensions. The zip must be extracted first.

## Setup

1. Open the extension options page from `chrome://extensions` or the extension menu.
2. Choose your provider:
   - `OpenAI`
   - `OpenRouter`
3. Enter the matching API key.
4. Choose a model.
5. Choose the rewrite voice.
6. Save.

## How To Use

1. Open LinkedIn at `https://www.linkedin.com/`.
2. Find a feed post with text.
3. Click `kerouAIc this`.
4. Wait for the post text to be rewritten in place.

Button states:
- `kerouAIc this`: ready
- `kerouAIc-ing...`: request in progress
- `kerouAIc-ed`: rewrite completed
- `Try again`: request failed

## How To Update

### If you installed from the repo folder

1. Pull the latest changes:

```bash
git pull
```

2. Open `chrome://extensions`.
3. Find `kerouAIc`.
4. Click the reload button on the extension card.
5. Refresh any open LinkedIn tabs.

### If you installed from the zip

1. Download the latest `kerouAIc_extension.zip`.
2. Extract it over your existing extension folder, or extract to a new folder.
3. Open `chrome://extensions`.
4. Reload the extension.
5. Refresh any open LinkedIn tabs.

## Troubleshooting

### The button does not show up

- Reload the extension in `chrome://extensions`
- Refresh LinkedIn fully
- Make sure you are on `https://www.linkedin.com/`

### I see `chrome-extension://invalid/` errors

This usually happens when Chrome still has an older content script attached to an already-open tab after the extension was reloaded.

Fix:
1. Reload the extension in `chrome://extensions`
2. Refresh LinkedIn hard, or close and reopen the tab

### The rewrite fails

- Check that the correct provider is selected
- Check that the matching API key is saved
- Check that the selected model is valid for that provider

## Version

Current release: `0.1`
