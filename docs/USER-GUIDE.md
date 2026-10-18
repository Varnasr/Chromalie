# Chromalie user guide

Chromalie is a free colouring studio at https://chromalie.page. Choose a page from the library, colour it in your browser, and save or download the result.

## Find a page

Browse the collections or use the search box, subject filters and detail filter. Select a page to open the painting workspace. **My work** shows paintings saved on the current device. **My journal** presents saved work as a flipbook.

## Painting tools

- **Solid fill:** tap or click inside a detected shape to colour it. A shape may need a moment to prepare after opening a page.
- **Brushes:** choose pencil, coloured pencil, marker, acrylic, oil, gouache, watercolour, pastel, charcoal, dry brush, airbrush, glitter, ink or other available tools. Brush samples are illustrative approximations of physical media.
- **Automatic / stay in lines:** clips brush strokes to detected regions. Use **Freehand** when you deliberately want to paint without region clipping.
- **Eraser:** remove applied colour. The original colouring-page outlines remain separate.
- **Size, opacity and shades:** adjust the active tool. Choose Everyday, Bright, Pastel, Garden, Earth, Ocean or My palette. The native colour picker lets you choose any colour, while the harmony row suggests analogous, complementary and triadic colours. The recent-colours row remembers your last eight selections for the current session. Use **Custom colour** and **Add colour** to collect favourites; select a saved colour in **My palette** to remove it using **Remove selected colour**.
- **Layers:** add up to five transparent layers, rename them, show or hide them, change opacity, reorder or delete them. Each layer has its own undo/redo history while the page remains open. Layer-stack changes cannot themselves be undone.
- **Undo / Redo:** reverse recent painting operations on the selected layer. History is limited and is not restored between visits.
- **Zoom and pan:** inspect details without changing the underlying image.

On smaller screens, tap **Tools +**, then open the **Colours**, brush or settings strips. Tap the artwork or press Escape to close a strip.

## Saving and exporting

When device saving is enabled, Chromalie saves painting progress in your browser's IndexedDB storage. This is local to that browser and device; it is **not** a cloud account or backup. If a save fails, use **Retry save** or download a copy before leaving. You can change storage preferences in the storage settings.

Use **Save editable project** to download a Chromalie JSON project, and **Open project** to restore it. Use PNG download for a finished image; printing is also available. Keep downloaded backups: clearing browser data or using a different device can mean locally saved work is unavailable.

## Common problems

- **A fill covers too much:** the source artwork may have an open boundary. Try adjusting the gap-closing setting or use an automatic brush on smaller areas.
- **A brush will not paint:** wait for region preparation, select an intended area, or deliberately switch to Freehand.
- **Saved work seems missing:** confirm you are using the same browser/device and have not cleared its site data.
- **Stylus pressure varies:** support depends on what your browser and device report through Pointer Events.

## Current limitations

Physical paint simulation, offline guarantees and painting replay are not provided. Structural changes to layers cannot be undone; download editable project backups before major edits. See the repository README for the release-quality gate.
