# Chrome Web Store Assets

Final upload-ready assets are stored in `docs/assets/` so the official website and Chrome Web Store use the same images:

- `store-screenshot-1-basic-1280x800.png`: close B and return to A
- `store-screenshot-2-history-not-neighbor-1280x800.png`: close C and return to A instead of adjacent B
- `store-screenshot-3-sequence-1280x800.png`: A → B → C, then close back through B to A
- `store-promo-440x280.png`: global small promotional image

Upload the screenshots in the numbered `1 → 2 → 3` order. The first image explains the basic action, the second distinguishes history from tab position, and the third shows repeated closing through the focus history.

## Capture conditions

- Chrome 150 on macOS
- 1280×800 Chrome window, captured at Retina resolution and downsampled to the required 1280×800 output
- Temporary Chrome profile with no Google sign-in or personal browsing data
- Self-authored English demo pages served from `127.0.0.1`; no third-party page, logo, photo, or copyrighted article content
- Bookmarks bar hidden; translation prompt disabled; no personal filesystem path is visible
- Instructional overlays use only A/B/C, arrows, step numbers, and Ctrl+W / Command+W, so the same set can be used for all six locales

`demo.html` is the self-contained demo-page source. The final PNG files are the upload artifacts; temporary raw captures and composition files are intentionally not kept in the repository.

## Promotional image

The abstract indigo/cobalt background was generated with the built-in image generation tool using this prompt:

> Create an abstract, polished technology background for a Chrome Web Store promotional tile. Use a deep indigo-to-cobalt field with broad flowing ribbons that suggest a smooth return motion from right to left. Add crisp electric cyan and a very small amount of warm coral for contrast. Keep a clean center area for the app icon. Background only; no app icon, browser tabs, arrows, logos, text, letters, watermark, Chrome branding, screenshots, or third-party content.

The actual extension icon and tab/focus composition were added deterministically after generation. Its editable source is `icons/icon.svg`; the packaged PNG sizes are generated from that source. AI was not used to generate the icon or alter Chrome UI.

## Localization

The visible demo-page text is neutral English scenery rather than an instruction. All instructional meaning is carried by language-independent symbols. If localized captures are later required, translate only the strings in `demo.html`, keep the A/B/C overlays unchanged, and render the same three layouts.
