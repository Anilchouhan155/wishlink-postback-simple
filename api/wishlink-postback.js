/**
 * Wishlink Postback Webhook - Vercel Serverless Function
 *
 * Receives Shopify order webhook, extracts tracking params from note_attributes
 * (set by theme from URL → localStorage → cart attributes), and fires postback to Wishlink.
 *
 * Webhook URL: https://wishlink-postback-simple.vercel.app/api/wishlink-postback
 */

/**
 * Safely extract a value from Shopify order note_attributes array.
 * note_attributes: [{ name: "clickid", value: "abc123" }, ...]
 *
 * @param {Object} order - Shopify order object
 * @param {string} key - Attribute name (e.g. "clickid", "goal_id")
 * @returns {string|null} - Attribute value or null if not found
 */
function getNoteAttribute(order, key) {
  const attrs = order?.note_attributes;
  if (!Array.isArray(attrs)) return null;
  const item = attrs.find((a) => a && a.name === key);
  return item && typeof item.value === "string" ? item.value : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!order || typeof order !== "object") {
      console.error("Invalid webhook payload: missing or invalid order object");
      return res.status(400).send("Invalid payload");
    }

    // Extract order fields
    const orderId = order.id;
    const amount = order.total_price;
    const currency = order.currency;

    if (orderId == null) {
      console.error("Invalid webhook payload: missing order.id");
      return res.status(400).send("Missing order id");
    }

    // Transaction ID: first transaction if exists, else fallback to order.id
    const transactionId =
      order?.transactions?.[0]?.id != null
        ? String(order.transactions[0].id)
        : String(orderId);

    // Extract tracking params from note_attributes (from cart attributes)
    const clickid =
      getNoteAttribute(order, "clickid") || String(orderId);
    const goalId =
      getNoteAttribute(order, "goal_id") ||
      process.env.WISHLINK_GOAL_ID ||
      "default_goal";
    const campaignId =
      getNoteAttribute(order, "campaign_id") ||
      process.env.WISHLINK_CAMPAIGN_ID ||
      "default_campaign";
    const creativeId =
      getNoteAttribute(order, "creative_id") ||
      process.env.WISHLINK_CREATIVE_ID ||
      "default_creative";

    // Build Wishlink postback URL with encoded values
    const params = new URLSearchParams();
    params.set("clickid", clickid);
    params.set("transaction_id", transactionId);
    params.set("payout", String(amount ?? "0"));
    params.set("currency", currency || "USD");
    params.set("goal_id", goalId);
    params.set("campaign_id", campaignId);
    params.set("creative_id", creativeId);

    const postbackUrl = `https://wishlink.com/postback?${params.toString()}`;

    console.log("Firing Wishlink postback:", postbackUrl);

    const fetchRes = await fetch(postbackUrl);

    if (!fetchRes.ok) {
      console.error(
        "Wishlink postback failed:",
        fetchRes.status,
        await fetchRes.text()
      );
      return res.status(502).send("Postback request failed");
    }

    console.log("Wishlink postback sent successfully");
    res.status(200).send("OK");
  } catch (err) {
    console.error("Wishlink postback error:", err);
    res.status(500).send("Error");
  }
}
