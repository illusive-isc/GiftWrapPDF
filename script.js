const { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFArray } = PDFLib;

const SITE_URL = 'https://illusive-isc.github.io/GiftWrapPDF/';
const DEFAULT_MESSAGE = 'お誕生日おめでとう！このリンクからプレゼントを受け取ってね。';
const DEFAULT_PAGE_WIDTH = 841.89; // A4 landscape
const DEFAULT_PAGE_HEIGHT = 595.28;
const MAX_URLS = 3;

// The card's width in PDF points — shared with the preview so it can compute
// the same horizontal inset regardless of the page's aspect ratio. The card's
// height is not fixed: both the PDF and the preview size it to fit however
// much message/URL content is actually there.
const PANEL_WIDTH = 480;

const messageInput = document.getElementById('gift-message');
const generateBtn = document.getElementById('generate-btn');
const statusEl = document.getElementById('status');
const templateGrid = document.getElementById('template-grid');
const customBgInput = document.getElementById('custom-bg-input');
const clearBgBtn = document.getElementById('clear-bg-btn');
const previewBg = document.getElementById('preview-bg');
const previewFrame = document.getElementById('preview-frame');
const previewPanel = document.getElementById('preview-panel');
const previewFooter = document.getElementById('preview-footer');
const urlRowsEl = document.getElementById('url-rows');
const addUrlBtn = document.getElementById('add-url-btn');
const qrToggle = document.getElementById('qr-toggle');
const qrBlock = document.getElementById('qr-block');
const previewQrImg = document.getElementById('preview-qr-img');
const qrLogoToggle = document.getElementById('qr-logo-toggle');
previewFooter.href = SITE_URL;
messageInput.placeholder = DEFAULT_MESSAGE;

function createUrlRow(removable) {
  const row = document.createElement('div');
  row.className = 'url-row';

  const input = document.createElement('input');
  input.type = 'url';
  input.className = 'preview-input preview-link-input url-field';
  input.placeholder = 'https://example.com/your-gift';
  input.setAttribute('aria-label', 'ギフトURL');
  row.appendChild(input);

  if (removable) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-url-btn';
    removeBtn.setAttribute('aria-label', 'このURLを削除');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
      updateAddUrlButtonVisibility();
    });
    row.appendChild(removeBtn);
  }

  return row;
}

function updateAddUrlButtonVisibility() {
  addUrlBtn.style.display = urlRowsEl.children.length >= MAX_URLS ? 'none' : '';
}

addUrlBtn.addEventListener('click', () => {
  if (urlRowsEl.children.length >= MAX_URLS) return;
  urlRowsEl.appendChild(createUrlRow(true));
  updateAddUrlButtonVisibility();
});

urlRowsEl.appendChild(createUrlRow(false));
updateAddUrlButtonVisibility();

function getUrls() {
  return [...urlRowsEl.querySelectorAll('.url-field')]
    .map((el) => el.value.trim())
    .filter((v) => v.length > 0);
}

// The QR always encodes the first (primary) gift URL, since it's rendered
// as a single stamp in one corner rather than one per URL.
function getQrTargetUrl() {
  const urls = getUrls();
  return urls.length > 0 ? urls[0] : '';
}

// Renders a QR code to a PNG data URL entirely client-side (qrcode-generator
// just encodes bits into a matrix; drawing it to a canvas ourselves keeps the
// output a PNG, which is what pdf-lib's embedPng needs — the library's own
// createDataURL() emits a GIF instead). A quiet-zone margin is added around
// the modules so the code stays reliably scannable.
//
// An optional logo is stamped over the center on a white backing. It's kept
// small (~24% of the module area) and paired with 'H' error correction (the
// most redundant level) so the code still scans with that much of it covered.
function buildQrDataUrl(text, { cellSize = 8, marginModules = 4, logo = null } = {}) {
  const qr = qrcode(0, logo ? 'H' : 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = (count + marginModules * 2) * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(marginModules * cellSize, marginModules * cellSize);
  qr.renderTo2dContext(ctx, cellSize);
  ctx.restore();

  if (logo) {
    const moduleAreaSize = count * cellSize;
    const logoSize = moduleAreaSize * 0.24;
    const pad = logoSize * 0.18;
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = 'white';
    ctx.fillRect(cx - logoSize / 2 - pad, cy - logoSize / 2 - pad, logoSize + pad * 2, logoSize + pad * 2);
    ctx.drawImage(logo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
  }

  return canvas.toDataURL('image/png');
}

// The BOOTH mark is bundled locally (icons/booth-favicon.png) rather than
// fetched from booth.pm or a favicon proxy at generation time, so choosing
// this option doesn't add any external request.
let boothLogoImagePromise = null;
function getBoothLogoImage() {
  if (!boothLogoImagePromise) {
    boothLogoImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'icons/booth-favicon.png';
    });
  }
  return boothLogoImagePromise;
}

qrToggle.addEventListener('change', updateQrPreview);

// Checking the logo option only makes sense once the QR itself is showing,
// so it implicitly turns the QR on too instead of staying disabled until the
// user checks a separate box first — that two-step requirement read as the
// checkbox simply not responding.
qrLogoToggle.addEventListener('change', () => {
  if (qrLogoToggle.checked) {
    qrToggle.checked = true;
  }
  updateQrPreview();
});

// Guards against an older, slower-resolving preview overwriting a newer one
// when the user edits the URL/logo option again before the first finishes.
let qrPreviewRequestId = 0;

async function updateQrPreview() {
  const url = getQrTargetUrl();
  const show = qrToggle.checked && url.length > 0;
  qrBlock.classList.toggle('visible', show);
  if (!show) return;

  const requestId = ++qrPreviewRequestId;
  const logo = qrLogoToggle.checked ? await getBoothLogoImage().catch(() => null) : null;
  if (requestId !== qrPreviewRequestId) return;

  previewQrImg.src = buildQrDataUrl(url, { logo });
}

urlRowsEl.addEventListener('input', updateQrPreview);
urlRowsEl.addEventListener('click', updateQrPreview);

// Small colored dots layered over a template's gradient (rendered as CSS
// radial-gradients in the preview and as canvas circles in the PDF) so
// celebratory templates read as confetti/sparkle rather than a flat wash.
const BIRTHDAY_CONFETTI = [
  { x: 12, y: 18, r: 2.2, color: '#ffffff' },
  { x: 85, y: 12, r: 3, color: '#ff6f91' },
  { x: 70, y: 30, r: 2, color: '#ffe066' },
  { x: 20, y: 45, r: 2.5, color: '#6ec6ff' },
  { x: 90, y: 55, r: 2, color: '#ffffff' },
  { x: 45, y: 15, r: 1.8, color: '#a685e2' },
  { x: 55, y: 80, r: 2.4, color: '#ff6f91' },
  { x: 15, y: 75, r: 2, color: '#ffe066' },
  { x: 80, y: 85, r: 2.6, color: '#6ec6ff' },
  { x: 35, y: 62, r: 1.6, color: '#ffffff' },
];

const ANNIVERSARY_SPARKLE = [
  { x: 20, y: 20, r: 1.8, color: '#fff8e1' },
  { x: 75, y: 15, r: 2.2, color: '#ffe9b3' },
  { x: 50, y: 35, r: 1.4, color: '#ffffff' },
  { x: 85, y: 55, r: 1.8, color: '#fff8e1' },
  { x: 15, y: 60, r: 2, color: '#ffe9b3' },
  { x: 40, y: 80, r: 1.6, color: '#ffffff' },
  { x: 65, y: 85, r: 1.9, color: '#fff8e1' },
  { x: 90, y: 30, r: 1.4, color: '#ffe9b3' },
];

const TEMPLATES = [
  { id: 'cream', name: 'シンプル', stops: ['#fff4ea', '#fdf6f0'], angle: 180 },
  { id: 'sunset', name: 'サンセット', stops: ['#ff9a76', '#ff6f91'], angle: 135 },
  { id: 'mint', name: 'ミント', stops: ['#a8e6cf', '#56c596'], angle: 135 },
  { id: 'night', name: 'ナイト', stops: ['#2c3e6b', '#141428'], angle: 135 },
  { id: 'gold', name: 'ゴールド', stops: ['#f7e7ce', '#e8c987'], angle: 135 },
  { id: 'birthday', name: 'ハッピーバースデー', stops: ['#ffd66b', '#ff8fab'], angle: 135, decorations: BIRTHDAY_CONFETTI },
  { id: 'anniversary', name: '記念日', stops: ['#f6d9b0', '#d4af7a'], angle: 135, decorations: ANNIVERSARY_SPARKLE },
];

// Builds the full CSS `background` value (dot layers on top of the gradient)
// for a template — shared by the swatch buttons and the live preview so
// both match the canvas-drawn version embedded in the PDF.
function templateBackgroundCSS(tpl) {
  const dotLayers = (tpl.decorations || []).map(
    (d) => `radial-gradient(circle at ${d.x}% ${d.y}%, ${d.color} 0%, ${d.color} ${d.r}%, transparent ${d.r}%)`
  );
  const gradient = `linear-gradient(${tpl.angle}deg, ${tpl.stops[0]}, ${tpl.stops[1]})`;
  return [...dotLayers, gradient].join(', ');
}

let currentBackground = { type: 'template', template: TEMPLATES[0] };

buildTemplateGrid();
loadCustomTemplates();
updateBackgroundPreview();
updateQrPreview();
messageInput.addEventListener('input', autosizeMessageWidth);
window.addEventListener('resize', autosizeMessageWidth);

// Shrinks/grows the message box to fit its widest line (a floor of half the
// card's width, capped at the full width) so a short message reads as a
// centered line instead of stretching edge-to-edge.
function autosizeMessageWidth() {
  const container = messageInput.parentElement;
  const containerWidth = container.clientWidth;
  if (!containerWidth) return;

  if (!autosizeMessageWidth.canvas) {
    autosizeMessageWidth.canvas = document.createElement('canvas');
  }
  const cs = getComputedStyle(messageInput);
  const ctx = autosizeMessageWidth.canvas.getContext('2d');
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

  const text = messageInput.value || messageInput.placeholder || '';
  let widest = 0;
  for (const line of text.split('\n')) {
    widest = Math.max(widest, ctx.measureText(line).width);
  }

  const minWidth = containerWidth * 0.5;
  const desired = Math.min(containerWidth, Math.max(minWidth, widest + 8));
  messageInput.style.width = `${desired}px`;
}

function buildTemplateGrid() {
  TEMPLATES.forEach((tpl) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'template-swatch';
    btn.title = tpl.name;
    btn.dataset.id = tpl.id;
    btn.style.background = templateBackgroundCSS(tpl);
    if (tpl.id === currentBackground.template?.id) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => selectTemplate(tpl));
    templateGrid.appendChild(btn);
  });
}

// Background images placed in templates/ (listed in templates/manifest.js)
// show up as extra swatches alongside the built-in gradients. Each entry is
// preloaded so it's ready to draw into the PDF canvas the moment it's
// clicked; an entry whose file 404s or fails to decode is silently skipped
// rather than showing a broken swatch. Requires the page to be served over
// http(s) — opened via file://, the browser blocks reading these images
// back out of the PDF canvas.
const customTemplateImages = new Map(); // id -> loaded HTMLImageElement

function loadCustomTemplates() {
  const entries = window.CUSTOM_TEMPLATES || [];
  entries.forEach((entry) => {
    const id = `custom-${entry.file}`;
    const img = new Image();
    img.onload = () => {
      customTemplateImages.set(id, img);
      addCustomTemplateSwatch(id, entry);
    };
    img.onerror = () => {
      console.warn('Could not load template image:', entry.file);
    };
    img.src = `templates/${entry.file}`;
  });
}

function addCustomTemplateSwatch(id, entry) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'template-swatch';
  btn.title = entry.name;
  btn.dataset.id = id;
  btn.style.backgroundImage = `url('templates/${entry.file}')`;
  btn.style.backgroundSize = 'cover';
  btn.style.backgroundPosition = 'center';
  btn.addEventListener('click', () => selectCustomTemplate(id, entry));
  templateGrid.appendChild(btn);
}

function selectCustomTemplate(id, entry) {
  const imageEl = customTemplateImages.get(id);
  if (!imageEl) return;

  revokeCustomImage();
  currentBackground = { type: 'image', imageEl, objectUrl: `templates/${entry.file}` };
  customBgInput.value = '';
  [...templateGrid.children].forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
  updateBackgroundPreview();
}

function selectTemplate(tpl) {
  revokeCustomImage();
  currentBackground = { type: 'template', template: tpl };
  customBgInput.value = '';
  [...templateGrid.children].forEach((el) => {
    el.classList.toggle('active', el.dataset.id === tpl.id);
  });
  updateBackgroundPreview();
}

customBgInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setStatus('画像ファイルを選択してください。', true);
    customBgInput.value = '';
    return;
  }

  try {
    const imageEl = await loadImageFromFile(file);
    revokeCustomImage();
    currentBackground = { type: 'image', imageEl, objectUrl: imageEl.src };
    [...templateGrid.children].forEach((el) => el.classList.remove('active'));
    setStatus('', false);
    updateBackgroundPreview();
  } catch (err) {
    console.error(err);
    setStatus('画像の読み込みに失敗しました。', true);
  }
});

clearBgBtn.addEventListener('click', () => {
  customBgInput.value = '';
  selectTemplate(TEMPLATES[0]);
});

function updateBackgroundPreview() {
  if (currentBackground.type === 'image') {
    previewBg.style.background = `url(${currentBackground.objectUrl}) center / cover no-repeat`;
  } else {
    previewBg.style.background = templateBackgroundCSS(currentBackground.template);
  }

  // Keep the preview frame's proportions — and the card's horizontal inset
  // within it — in sync with the PDF, which changes to match an uploaded
  // photo's aspect ratio. The card's height isn't set here: like the PDF, it
  // just hugs its own content (see .preview-panel's CSS).
  const { width, height } = computePageSize(currentBackground);
  previewFrame.style.aspectRatio = `${width} / ${height}`;

  const insetX = ((width - PANEL_WIDTH) / 2 / width) * 100;
  previewPanel.style.left = `${insetX}%`;
  previewPanel.style.right = `${insetX}%`;

  autosizeMessageWidth();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = objectUrl;
  });
}

function revokeCustomImage() {
  if (currentBackground.type === 'image' && currentBackground.objectUrl) {
    URL.revokeObjectURL(currentBackground.objectUrl);
  }
}

generateBtn.addEventListener('click', async () => {
  const urls = getUrls();
  const message = messageInput.value.trim();

  setStatus('', false);

  if (urls.length === 0) {
    setStatus('ギフトURLを入力してください。', true);
    return;
  }
  if (!urls.every(isValidUrl)) {
    setStatus('有効なURLを入力してください（例: https://example.com）。', true);
    return;
  }

  generateBtn.disabled = true;
  setStatus('PDFを生成中...', false);

  try {
    const pdfBytes = await createGiftPdf(urls, message, currentBackground);
    downloadPdf(pdfBytes, 'GiftWrapPDF.pdf');
    setStatus('PDFをダウンロードしました！', false);
  } catch (err) {
    console.error(err);
    setStatus('PDFの生成に失敗しました。', true);
  } finally {
    generateBtn.disabled = false;
  }
});

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

async function createGiftPdf(urls, message, background) {
  const pdfDoc = await PDFDocument.create();
  const { width: pageWidth, height: pageHeight } = computePageSize(background);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // The message is free-form user input and often contains Japanese text,
  // which the built-in WinAnsi-only Helvetica cannot encode. Embed a CJK
  // capable font just for that block; static ASCII labels keep Helvetica.
  // subset:true silently drops most glyphs for this font (pdf-lib subsetting
  // bug), so embed it in full even though that makes the PDF a few hundred KB
  // larger.
  pdfDoc.registerFontkit(fontkit);
  const cjkFontBytes = await getCjkFontBytes();
  const cjkFont = await pdfDoc.embedFont(cjkFontBytes, { subset: false });

  // Compose the background (template gradient or uploaded photo) into one PNG
  // so the PDF always matches the on-screen preview exactly.
  const bgPngBytes = buildBackgroundPng(width, height, background);
  const bgImage = await pdfDoc.embedPng(bgPngBytes);
  page.drawImage(bgImage, { x: 0, y: 0, width, height });

  // The card hugs its own content — its height is computed from how many
  // message lines and URLs there actually are, instead of a fixed height
  // that leaves a large blank gap for a short message.
  const panelWidth = PANEL_WIDTH;
  const padding = 32;
  const contentWidth = panelWidth - padding * 2;

  const messageFontSize = 12.5;
  const linkFontSize = 12.5;
  const footerSize = 8;
  const lineHeight = 19;
  const topPadding = 30;
  const bottomPadding = 22;
  const gapMessageToUrls = 14;
  const gapUrlsToFooter = 16;
  const gapToQr = 18;
  const qrSize = 64;

  // The QR encodes only the primary (first) gift URL — it's a single stamp
  // in the corner, not one per URL.
  const showQr = qrToggle.checked && urls.length > 0;

  // Message body — falls back to the same friendly default shown as the
  // preview's placeholder, so an empty field doesn't produce a blank-feeling card.
  const bodyText = message || DEFAULT_MESSAGE;
  const lines = wrapText(bodyText, cjkFont, messageFontSize, contentWidth);

  const contentHeight =
    lines.length * lineHeight +
    gapMessageToUrls +
    urls.length * lineHeight +
    (showQr ? gapToQr + qrSize : 0) +
    gapUrlsToFooter +
    footerSize;
  const panelHeight = Math.max(140, topPadding + contentHeight + bottomPadding);

  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2;
  const panelTopY = panelY + panelHeight;
  const contentX = panelX + padding;

  page.drawSvgPath(roundedRectPath(panelWidth, panelHeight, 20), {
    x: panelX,
    y: panelTopY,
    color: rgb(1, 1, 1),
    opacity: 0.72,
  });

  let y = panelTopY - topPadding - 10;

  for (const line of lines) {
    const lineWidth = cjkFont.widthOfTextAtSize(line, messageFontSize);
    page.drawText(line, {
      x: contentX + (contentWidth - lineWidth) / 2,
      y,
      size: messageFontSize,
      font: cjkFont,
      color: rgb(0.2, 0.19, 0.18),
    });
    y -= lineHeight;
  }

  y -= gapMessageToUrls;

  // Gift URL(s), stacked top-to-bottom right after the message.
  const linkColor = rgb(0.13, 0.4, 0.85);

  for (const url of urls) {
    const linkTextWidth = font.widthOfTextAtSize(url, linkFontSize);
    const linkX = contentX + (contentWidth - linkTextWidth) / 2;

    page.drawText(url, {
      x: linkX,
      y,
      size: linkFontSize,
      font,
      color: linkColor,
    });

    // Underline to look like a hyperlink
    page.drawLine({
      start: { x: linkX, y: y - 2 },
      end: { x: linkX + linkTextWidth, y: y - 2 },
      thickness: 0.75,
      color: linkColor,
    });

    // Clickable link annotation over the URL text
    addLinkAnnotation(pdfDoc, page, {
      x: linkX,
      y: y - 4,
      width: linkTextWidth,
      height: linkFontSize + 4,
    }, url);

    y -= lineHeight;
  }

  // QR stamp for the primary URL, right-aligned like the footer wordmark
  // below it — keeps both bottom-right elements sharing the same edge.
  if (showQr) {
    y -= gapToQr;

    const qrLogo = qrLogoToggle.checked ? await getBoothLogoImage().catch(() => null) : null;
    const qrDataUrl = buildQrDataUrl(urls[0], { logo: qrLogo });
    const qrImage = await pdfDoc.embedPng(dataUrlToBytes(qrDataUrl));
    const qrX = contentX + contentWidth - qrSize;
    const qrY = y - qrSize;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    addLinkAnnotation(pdfDoc, page, { x: qrX, y: qrY, width: qrSize, height: qrSize }, urls[0]);
    y = qrY;
  }

  y -= gapUrlsToFooter;

  // Small, understated wordmark pinned to the bottom-right of the card,
  // linking back to the GiftWrapPDF site.
  const footerText = 'Provided by GiftWrapPDF';
  const footerWidth = font.widthOfTextAtSize(footerText, footerSize);
  const footerX = contentX + contentWidth - footerWidth;
  page.drawText(footerText, {
    x: footerX,
    y,
    size: footerSize,
    font,
    color: rgb(0.68, 0.65, 0.63),
  });

  addLinkAnnotation(pdfDoc, page, {
    x: footerX,
    y: y - 2,
    width: footerWidth,
    height: footerSize + 3,
  }, SITE_URL);

  return pdfDoc.save();
}

// Fetches (once) a Japanese-capable font so free-form gift messages can
// contain kana/kanji, which the built-in WinAnsi-only Helvetica cannot encode.
// Must be a static (non-variable) font: pdf-lib/fontkit does not resolve
// variable-font axes, which left most glyphs blank when a variable TTF was used.
let cjkFontBytesPromise = null;
function getCjkFontBytes() {
  if (!cjkFontBytesPromise) {
    const CJK_FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/mplus1p/MPLUS1p-Regular.ttf';
    cjkFontBytesPromise = fetch(CJK_FONT_URL).then((res) => {
      if (!res.ok) throw new Error('Failed to load Japanese font');
      return res.arrayBuffer();
    });
  }
  return cjkFontBytesPromise;
}

// A gradient template has no natural shape, so it keeps the default A4
// landscape page. An uploaded photo instead sets the page to that photo's
// aspect ratio, scaled to roughly the same paper area as A4 landscape so the
// PDF stays a sensible print size regardless of how the photo is cropped.
function computePageSize(background) {
  if (background.type === 'image' && background.imageEl) {
    const aspect = background.imageEl.naturalWidth / background.imageEl.naturalHeight;
    const targetArea = DEFAULT_PAGE_WIDTH * DEFAULT_PAGE_HEIGHT;
    const height = Math.sqrt(targetArea / aspect);
    const width = height * aspect;
    return { width, height };
  }
  return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };
}

// Renders the chosen background (gradient template or uploaded photo, cover-fit)
// onto an offscreen canvas so the exported PDF pixel-matches the live preview.
function buildBackgroundPng(pageWidth, pageHeight, background) {
  const scale = 2; // render at 2x for crisp print quality
  const canvas = document.createElement('canvas');
  canvas.width = pageWidth * scale;
  canvas.height = pageHeight * scale;
  const ctx = canvas.getContext('2d');

  if (background.type === 'image' && background.imageEl) {
    drawImageCover(ctx, background.imageEl, canvas.width, canvas.height);
  } else {
    const { stops, angle } = background.template;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * canvas.width;
    const y = Math.sin(rad) * canvas.height;
    const grad = ctx.createLinearGradient(0, canvas.height, x, canvas.height - y);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(1, stops[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (background.template.decorations) {
      const minDim = Math.min(canvas.width, canvas.height);
      ctx.globalAlpha = 0.85;
      for (const dot of background.template.decorations) {
        ctx.beginPath();
        ctx.fillStyle = dot.color;
        ctx.arc((dot.x / 100) * canvas.width, (dot.y / 100) * canvas.height, (dot.r / 100) * minDim, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrlToBytes(dataUrl);
}

function drawImageCover(ctx, img, targetW, targetH) {
  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;
  let sx, sy, sw, sh;

  if (imgRatio > targetRatio) {
    sh = img.height;
    sw = sh * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Character-by-character wrap: Japanese text has no spaces between words,
// so word-boundary wrapping alone would let a whole sentence run off the page.
function wrapText(text, font, fontSize, maxWidth) {
  const paragraphs = text.split(/\r?\n/);
  const lines = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (const char of paragraph) {
      const testLine = currentLine + char;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

// pdf-lib's drawRectangle has no corner-radius option, so the rounded panel
// is drawn as a single SVG path fill instead (avoids overlapping shapes,
// which would double up and darken the translucent fill at the corners).
// drawSvgPath flips the path's Y axis, so this is authored top-left-origin,
// Y increasing downward, matching normal SVG convention.
function roundedRectPath(width, height, radius) {
  const r = radius;
  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `V ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}

function addLinkAnnotation(pdfDoc, page, rect, url) {
  const linkAnnotation = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(url),
    },
  });

  const linkRef = pdfDoc.context.register(linkAnnotation);

  const existingAnnots = page.node.lookup(PDFName.of('Annots'), PDFArray);
  if (existingAnnots) {
    existingAnnots.push(linkRef);
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkRef]));
  }
}

function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
