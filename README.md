# Loopa Extension

Loopa Extension is an open-source Chrome extension add-on for [loopa.framer.site](https://loopa.framer.site). It brings Loopa search, browsing, opening, and saving into the browser toolbar, without requiring the website to be opened first.

The extension opens as a floating panel on top of the active tab, keeping the Loopa collection one click away.

## Features

- Opens Loopa in a compact browser overlay.
- Searches across saved websites, tools, categories, descriptions, and pricing labels.
- Filters by category, pricing, new items, and local bookmarks.
- Switches between grid and list views.
- Saves bookmarks locally in the browser.
- Opens selected websites in a new tab.

## How It Works

```text
Chrome toolbar button
        |
        v
Loopa extension overlay
        |
        v
Loopa API
        |
        v
Loopa content
```

The extension is the browser add-on for Loopa. It displays Loopa content served through Loopa's API.

## Project Structure

```text
archive/       Extension UI shown inside the overlay
assets/        Loopa brand assets
background/    Manifest V3 service worker
content/       Overlay injector for the active browser tab
icons/         Extension icons
lib/           Shared browser, storage, API, and icon helpers
worker/        Loopa API worker used by the project
build.ps1      Production packaging script
manifest.json  Chrome extension manifest
```

## Development

1. Clone the repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder.
6. Pin Loopa to the toolbar.

Click the Loopa icon on any regular webpage to open or close the panel.

## Packaging

Run the build script from the project root:

```powershell
.\build.ps1
```

The script checks for obvious leaked secrets, copies only the extension files needed for publishing, and creates a versioned zip file.

## Privacy

- Bookmarks are stored locally in the browser.
- The content shown in the extension is maintained by Loopa.

## License

Open source license to be added.
