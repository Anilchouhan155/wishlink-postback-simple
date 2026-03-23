# Wishlink Tracking – Full Implementation

End-to-end tracking: URL params → localStorage → cart attributes → order webhook → Wishlink postback.

---

## Architecture

```
User visits: store.com?clickid=abc&goal_id=g1&campaign_id=c1&creative_id=cr1
       ↓
PART 1: theme.liquid reads URL, stores in localStorage (only if value exists)
       ↓
PART 2: theme.liquid syncs localStorage → Shopify cart via POST /cart/update.js
       ↓
User adds to cart, checks out, order created
       ↓
Shopify fires Order creation webhook → POST /api/wishlink-postback
       ↓
PART 3: Backend extracts order + note_attributes
       ↓
PART 4–5: Builds Wishlink URL, fires GET postback
```

---

## PART 1 & 2: Theme Scripts (theme.liquid)

**Location:** `layout/theme.liquid` – script before `</body>`

- Uses `URLSearchParams` to read `clickid`, `goal_id`, `campaign_id`, `creative_id`
- Only stores if value exists; does not overwrite existing with empty
- Sends to cart via `POST /cart/update.js` with `{ attributes: { key: value } }`
- Basic guard to avoid repeated calls (sessionStorage)

---

## PART 3–5: Backend (api/wishlink-postback.js)

**Helper:** `getNoteAttribute(order, key)` – safely extracts from `note_attributes` array

**Extracted data:**
- `order.id` → order ID
- `order.total_price` → payout
- `order.currency` → currency
- `order.transactions[0].id` or `order.id` → transaction_id
- `note_attributes` → clickid, goal_id, campaign_id, creative_id

**Wishlink URL format:**
```
https://wishlink.com/postback?clickid={clickid}&transaction_id={transaction_id}&payout={amount}&currency={currency}&goal_id={goal_id}&campaign_id={campaign_id}&creative_id={creative_id}
```

All values are URL-encoded via `URLSearchParams`.

---

## Example Webhook Payload & Mapping

### Minimal Shopify Order Webhook (excerpt)

```json
{
  "id": 5678901234,
  "total_price": "99.00",
  "currency": "USD",
  "transactions": [
    { "id": 12345678901 }
  ],
  "note_attributes": [
    { "name": "clickid", "value": "wl_abc123xyz" },
    { "name": "goal_id", "value": "purchase" },
    { "name": "campaign_id", "value": "camp_001" },
    { "name": "creative_id", "value": "cr_001" }
  ]
}
```

### Mapping to Wishlink Params

| Shopify Field | Wishlink Param | Example |
|---------------|----------------|---------|
| `note_attributes[clickid]` | `clickid` | `wl_abc123xyz` |
| `transactions[0].id` or `order.id` | `transaction_id` | `12345678901` |
| `order.total_price` | `payout` | `99.00` |
| `order.currency` | `currency` | `USD` |
| `note_attributes[goal_id]` | `goal_id` | `purchase` |
| `note_attributes[campaign_id]` | `campaign_id` | `camp_001` |
| `note_attributes[creative_id]` | `creative_id` | `cr_001` |

### Fallbacks

- **clickid:** `note_attributes[clickid]` → `order.id`
- **goal_id, campaign_id, creative_id:** `note_attributes` → env vars → `default_*`

---

## Testing Steps

### 1. Test Theme Capture (URL → localStorage)

1. Visit: `https://YOUR-STORE.myshopify.com?clickid=test123&goal_id=g1&campaign_id=c1&creative_id=cr1`
2. Open DevTools → **Application** → **Local Storage**
3. Check: `wishlink_clickid`, `wishlink_goal_id`, etc. have values

### 2. Test Cart Sync (localStorage → Cart)

1. With URL params still in place, add any product to cart
2. In DevTools Console: `fetch('/cart.js').then(r=>r.json()).then(d=>console.log(d.attributes))`
3. You should see `clickid`, `goal_id`, `campaign_id`, `creative_id` in `attributes`

### 3. Test Backend Endpoint (curl)

```bash
curl -X POST https://wishlink-postback-simple.vercel.app/api/wishlink-postback \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "total_price": "49.99",
    "currency": "USD",
    "transactions": [{"id": 67890}],
    "note_attributes": [
      {"name": "clickid", "value": "wl_test123"},
      {"name": "goal_id", "value": "purchase"},
      {"name": "campaign_id", "value": "camp_001"},
      {"name": "creative_id", "value": "cr_001"}
    ]
  }'
```

Expected: `OK`

### 4. Live End-to-End Test

1. Ensure Shopify webhook is set: **Settings → Notifications → Webhooks** → Order creation → `https://wishlink-postback-simple.vercel.app/api/wishlink-postback`
2. Visit store with tracking URL: `https://YOUR-STORE.com?clickid=live_test&goal_id=g1&campaign_id=c1&creative_id=cr1`
3. Add product to cart and complete checkout
4. Check **Vercel** → Logs for "Firing Wishlink postback" and "Wishlink postback sent successfully"
5. Check **Wishlink** dashboard for the conversion

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| No params in localStorage | URL must have `?clickid=...` etc. before other hash/fragment |
| Cart attributes empty | Run cart sync after page load; cart may need at least one item for some themes |
| note_attributes missing on order | Cart attributes must be set before checkout; ensure script runs on all pages |
| Postback 502 | Wishlink URL/params; check Vercel logs for response |
| Postback not in Wishlink | Verify clickid matches Wishlink tracking; check goal/campaign/creative IDs |
