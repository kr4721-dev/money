以下は **PayPay 決済** を Web ページに組み込み、決済完了後にサーバー側で任意の処理（例：データベース更新、メール送信、在庫減算 など）を実行する最小構成例です。  

---

## 1. フロントエンド（HTML + JavaScript）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>PayPay 決済デモ</title>
  <script src="https://static.paypay.ne.jp/paypay-js-sdk/v1/paypay.js"></script>
</head>
<body>
  <h1>PayPay でお支払い</h1>

  <!-- 商品情報（例） -->
  <div id="product">
    <p>商品名: プレミアムプラン</p>
    <p>金額: <span id="amount">5000</span> 円</p>
    <button id="payBtn">PayPay で支払う</button>
  </div>

  <script>
    // PayPay JavaScript SDK の初期化
    const paypay = new Paypay({
      // ここはサーバー側で取得した「clientId」を埋め込む
      clientId: 'YOUR_CLIENT_ID',          // ←サーバー側で生成した clientId を埋めてください
      merchantId: 'YOUR_MERCHANT_ID'       // ←PayPay から取得した merchantId
    });

    document.getElementById('payBtn').addEventListener('click', async () => {
      const amount = Number(document.getElementById('amount').textContent);

      // ① フロント側で決済リクエストをサーバーへ送信（署名付きトークン取得）
      const res = await fetch('/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();   // { paymentId, redirectUrl, ... }

      // ② PayPay SDK で決済画面へ遷移
      paypay.redirectToPayment({
        paymentId: data.paymentId,
        redirectUrl: data.redirectUrl   // PayPay 側で決済完了後にリダイレクトされる URL
      });
    });
  </script>
</body>
</html>
```

### ポイント
- **PayPay JavaScript SDK** を `https://static.paypay.ne.jp/paypay-js-sdk/v1/paypay.js` から読み込みます。  
- ボタンをクリックすると `/create-payment` エンドポイントへ **POST** し、サーバー側で署名付き決済情報（`paymentId` など）を取得します。  
- 取得した `paymentId` と `redirectUrl` を `paypay.redirectToPayment()` に渡すだけで、PayPay の決済画面へ遷移します。

---

## 2. バックエンド（例：Node.js + Express）

> **重要**  
> API キー・シークレットは **絶対にフロント側に出さない** でください。サーバー側でのみ保持し、署名生成や決済ステータス確認を行います。

```bash
# 必要パッケージ
npm install express body-parser crypto axios
```

```js
// server.js
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();   // .env に API_KEY, API_SECRET, MERCHANT_ID を保存

const app = express();
app.use(bodyParser.json());

// PayPay API エンドポイント（サンドボックスは https://stg-api.paypay.ne.jp）
const PAYPAY_API_BASE = 'https://api.paypay.ne.jp';

// ---------- 1. 決済作成 ----------
app.post('/create-payment', async (req, res) => {
  const { amount } = req.body;
  const orderId = `order_${Date.now()}`; // 任意のユニーク ID

  const payload = {
    merchantPaymentId: orderId,
    amount: {
      amount: amount,
      currency: 'JPY'
    },
    userAuthorizationId: '', // 任意で設定可
    redirectUrl: `https://yourdomain.com/paypay-callback?orderId=${orderId}`,
    redirectType: 'WEB_LINK' // Web でリダイレクト
  };

  // ---- 署名生成 ----
  const timestamp = Math.floor(Date.now() / 1000);
  const method = 'POST';
  const endpoint = '/v2/payments';
  const bodyString = JSON.stringify(payload);
  const message = `${timestamp}${method}${endpoint}${bodyString}`;
  const signature = crypto
    .createHmac('sha256', process.env.API_SECRET)
    .update(message)
    .digest('base64');

  try {
    const response = await axios.post(
      `${PAYPAY_API_BASE}${endpoint}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `hmac ${process.env.API_KEY}:${signature}`,
          'X-PAYPAY-REQUEST-ID': crypto.randomUUID(),
          'X-PAYPAY-TIMESTAMP': timestamp
        }
      }
    );

    // PayPay から返ってくる paymentId と redirectUrl をフロントへ返す
    const { data } = response;
    res.json({
      paymentId: data.resultInfo.paymentId,
      redirectUrl: data.resultInfo.redirectUrl
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'PayPay request failed' });
  }
});

// ---------- 2. 決済完了コールバック ----------
app.get('/paypay-callback', async (req, res) => {
  const { orderId, paymentId, result } = req.query; // PayPay が付与するクエリ

  // result が SUCCESS かどうかを確認
  if (result === 'SUCCESS') {
    // ---- 任意の処理例 ----
    // 例: DB に注文ステータスを更新、メール送信、在庫減算など
    console.log(`✅ Order ${orderId} が支払われました (paymentId: ${paymentId})`);
    // ここに自前のロジックを書きます
  } else {
    console.warn(`⚠️ Order ${orderId} の決済が失敗しました`);
  }

  // ユーザーへ最終ページを表示
  res.send(`
    <h1>決済 ${result === 'SUCCESS' ? '完了' : '失敗'}</h1>
    <p>注文番号: ${orderId}</p>
    <a href="/">トップへ戻る</a>
  `);
});

// ---------- サーバ起動 ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
```

### 必要な環境変数（`.env`）

```
API_KEY=YOUR_PAYPAY_API_KEY
API_SECRET=YOUR_PAYPAY_API_SECRET
MERCHANT_ID=YOUR_MERCHANT_ID
```

---

## 3. フロー概要

1. **ユーザーが「PayPay で支払う」ボタンをクリック** → フロントが `/create-payment` に金額送信。  
2. **サーバーが PayPay API にリクエスト**（署名付き）し、`paymentId` と `redirectUrl` を取得。  
3. **フロントが PayPay SDK で決済画面へ遷移**。ユーザーは PayPay アプリ／Web で支払う。  
4. **決済完了後、PayPay が `redirectUrl`（＝ `/paypay-callback`）へリダイレクト**。クエリに `result=SUCCESS` などが付く。  
5. **サーバー側 `/paypay-callback` が呼び出され、任意のビジネスロジックを実行**（DB 更新、メール送信、在庫管理など）。  

---

## 4. 注意点

| 項目 | 内容 |
|------|------|
| **サンドボックス** | 開発中は `https://stg-api.paypay.ne.jp` を使用し、テスト用の API キーを取得してください。 |
| **HTTPS 必須** | 本番環境は必ず HTTPS（TLS）で提供し、PayPay からのリクエストを受け取ります。 |
| **署名の有効期限** | `X-PAYPAY-TIMESTAMP` は秒単位で現在時刻。5 分以内に有効です。 |
| **リクエスト ID** | `X-PAYPAY-REQUEST-ID` は重複しない UUID を設定してください（冪等性確保）。 |
| **決済結果の検証** | コールバックだけでなく、**PayPay の決済照会 API** (`GET /v2/payments/{merchantPaymentId}`) で最終ステータスを再確認すると安全です。 |

---

## 5. 参考リンク（公式）  

- PayPay API リファレンス（決済作成）: https://paypay.ne.jp/merchant/api/  
- PayPay JavaScript SDK: https://github.com/paypay/paypay-js-sdk  

---

この構成をベースに、**商品情報や金額の取得方法、決済後の具体的処理**（例：メール送信は Nodemailer、DB は MongoDB など）を組み合わせれば、実用的な課金サービスが完成します。必要に応じてフロント側の UI を整えてください。