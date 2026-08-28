// Background template images live in this templates/ folder.
// To add one: drop the image file here, then add a line below with its
// filename and a display name. It will appear in the template picker
// automatically the next time the page loads.
//
// Note: this only works when GiftWrapPDF is served over http(s) (e.g. a
// local dev server), not when index.html is opened directly (file://) —
// the browser blocks reading local image files into a PDF in that mode.
window.CUSTOM_TEMPLATES = [
  { file: 'sakura.jpg', name: 'さくら' },
  { file: 'starry-night.jpg', name: '星空' },
];
