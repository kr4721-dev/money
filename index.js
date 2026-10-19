```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>サンプルページ</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            background-color: #f5f5f5;
        }
        header, footer {
            background-color: #333;
            color: #fff;
            padding: 1rem;
            text-align: center;
        }
        main {
            padding: 2rem;
        }
        .card {
            background: #fff;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        nav a {
            color: #fff;
            margin: 0 0.5rem;
            text-decoration: none;
        }
        nav a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>

<header>
    <h1>ようこそ！</h1>
    <nav>
        <a href="#">ホーム</a>
        <a href="#">サービス</a>
        <a href="#">お問い合わせ</a>
    </nav>
</header>

<main>
    <section class="card">
        <h2>見出し 1</h2>
        <p>これはサンプルテキストです。HTMLの基本構造を示すためのコンテンツです。</p>
    </section>

    <section class="card">
        <h2>見出し 2</h2>
        <p>さらに別の段落を追加して、ページのレイアウトを確認できます。</p>
        <ul>
            <li>リスト項目 1</li>
            <li>リスト項目 2</li>
            <li>リスト項目 3</li>
        </ul>
    </section>

    <section class="card">
        <h2>画像の例</h2>
        <img src="https://via.placeholder.com/600x300" alt="サンプル画像" style="max-width:100%; height:auto;">
    </section>
</main>

<footer>
    <p>&copy; 2026 サンプル会社. All rights reserved.</p>
</footer>

</body>
</html>
```