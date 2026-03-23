# Wishlink Postback Webhook (Simple)

Minimal serverless backend for Shopify order webhooks → Wishlink postback.

## Deploy to Vercel

### 1. Push to GitHub

```bash
cd wishlink-postback-simple
git init
git add .
git commit -m "Initial commit"
```

Create a repo on [GitHub](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/wishlink-postback-simple.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your `wishlink-postback-simple` repo
3. (Optional) Add Environment Variables before deploying:

| Name | Value |
|------|-------|
| `WISHLINK_GOAL_ID` | Your Wishlink goal ID |
| `WISHLINK_CAMPAIGN_ID` | Your Wishlink campaign ID |
| `WISHLINK_CREATIVE_ID` | Your Wishlink creative ID |

4. Click **Deploy**

---

## Webhook URL

After deployment, your webhook URL will be:

```
https://YOUR_PROJECT.vercel.app/api/wishlink-postback
```

Example: `https://wishlink-postback-simple.vercel.app/api/wishlink-postback`

---

## Shopify Webhook Setup

1. Shopify Admin → **Settings** → **Notifications** → **Webhooks**
2. Create webhook: **Order creation**
3. **Format**: JSON
4. **URL**: `https://YOUR_PROJECT.vercel.app/api/wishlink-postback`

---

## Local Test

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/wishlink-postback \
  -H "Content-Type: application/json" \
  -d '{"id":"123","total_price":"99.99","currency":"USD","transactions":[{"id":"tx_456"}]}'
```
