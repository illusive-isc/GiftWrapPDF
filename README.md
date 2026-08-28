# 🎁 GiftWrapPDF

ギフトのURL（Amazonの欲しいものリスト、電子ギフト券、オンラインカードなど）を、
印刷して手渡しできる「ギフトラッピング風PDF」に変換するシンプルなWebアプリです。

**→ https://illusive-isc.github.io/GiftWrapPDF/**

## 特徴

- 🎨 背景テンプレートから選択、または好きな画像をアップロードして背景に設定
- ✉️ メッセージとギフトURL（最大3件）を入力してカードを作成
- 🔗 生成されるPDFのURL・フッターはクリック可能なリンクとして埋め込み
- 🈶 日本語メッセージに対応（CJKフォントを自動で埋め込み）
- 🖥️ 完全にブラウザ内で完結 — サーバーへのアップロードや送信は一切なし
  （PDF生成ライブラリとフォントのみCDNから読み込みます）

## 使い方

1. サイトを開く
2. 背景テンプレートを選ぶか、画像をアップロード
3. メッセージとギフトURLを入力
4. 「PDFを生成する」をクリックしてダウンロード
5. 印刷してプレゼントに添えるだけ

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
- GitHub Actions で `main` への push 時に GitHub Pages へ自動デプロイ

## ライセンス

[MIT License](LICENSE)
