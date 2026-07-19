# Chrome Web Store Assets

Final upload-ready assets are stored in `docs/assets/` so the official website and Chrome Web Store use the same images:

- `store-screenshot-1-basic-1280x800.png`: close B and return to A
- `store-screenshot-2-history-not-neighbor-1280x800.png`: close C and return to A instead of adjacent B
- `store-screenshot-3-sequence-1280x800.png`: A → B → C, then close back through B to A
- `store-promo-440x280.png`: global small promotional image

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

> Create a polished, saturated abstract background that suggests smooth backward movement and focus returning, using layered rounded geometric ribbons. Background only; no browser interface, Chrome logo, tabs, app icon, arrows, text, symbols, or watermark.

The actual extension icon and tab/focus composition were added deterministically after generation. AI was not used to generate or alter Chrome UI.

## Localization

The visible demo-page text is neutral English scenery rather than an instruction. All instructional meaning is carried by language-independent symbols. If localized captures are later required, translate only the strings in `demo.html`, keep the A/B/C overlays unchanged, and render the same three layouts.
