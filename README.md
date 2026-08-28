# 🎁 GiftWrapPDF

ギフトのURL（Amazonの欲しいものリスト、電子ギフト券、オンラインカードなど）を、
ギフトラッピング風のデザインでPDFにまとめるシンプルなWebアプリです。
そのまま送っても、印刷して手渡ししても使えます。

**→ https://illusive-isc.github.io/GiftWrapPDF/**

## 特徴

- 🎨 背景テンプレートから選択、または好きな画像をアップロードして背景に設定
- ✉️ メッセージとギフトURL（最大3件）を入力してカードを作成
- 📱 チェックを入れると、1件目のギフトURLのQRコードを右下に追加
  （さらにBOOTHのURLなら、QR中央にBOOTHのアイコンを重ねる表示も選択可能）
- 🔗 生成されるPDFのURL・QR・フッターはクリック可能なリンクとして埋め込み
- 🈶 日本語メッセージに対応（CJKフォントを自動で埋め込み）
- 🖥️ 完全にブラウザ内で完結 — サーバーへのアップロードや送信は一切なし
  （PDF生成ライブラリ・フォント・QR生成ライブラリのみCDNから読み込みます。
  QR中央のBOOTHアイコンはリポジトリに同梱済みで外部取得なし）

## 使い方

1. サイトを開く
2. 背景テンプレートを選ぶか、画像をアップロード
3. メッセージとギフトURLを入力
4. 「PDFを生成する」をクリックしてダウンロード
5. PDFのまま送るか、印刷してプレゼントに添える

## 背景テンプレートの追加

[templates/manifest.js](templates/manifest.js) に画像ファイルを追加すると、
テンプレート選択に自動で表示されます。

```js
window.CUSTOM_TEMPLATES = [
  { file: "sakura.jpg", name: "さくら" },
  { file: "starry-night.jpg", name: "星空" },
];
```

`templates/` フォルダに画像を置き、上記に1行追加するだけです。

## 技術構成

- Vanilla JS / HTML / CSS（ビルド不要）
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF生成
- [@pdf-lib/fontkit](https://github.com/Hopding/fontkit) — カスタムフォント埋め込み
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — QRコード生成
- GitHub Actions で `main` への push 時に GitHub Pages へ自動デプロイ

## ライセンス

[MIT License](LICENSE)
