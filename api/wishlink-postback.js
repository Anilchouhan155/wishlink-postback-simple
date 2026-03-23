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
      console.error("Invalid webhook payload");
      return res.status(400).send("Invalid payload");
    }

    const orderId = order.id;
    const amount = order.total_price;
    const currency = order.currency;

    const transactionId =
      order?.transactions?.[0]?.id != null
        ? String(order.transactions[0].id)
        : String(orderId);

    // ✅ STRICT extraction (NO FALLBACKS)
    const clickid = getNoteAttribute(order, "clickid");
    const goalId =
      getNoteAttribute(order, "goal_id") || process.env.WISHLINK_GOAL_ID;
    const campaignId =
      getNoteAttribute(order, "campaign_id") || process.env.WISHLINK_CAMPAIGN_ID;
    const creativeId =
      getNoteAttribute(order, "creative_id") || process.env.WISHLINK_CREATIVE_ID;

    // 🔥 VALIDATION BLOCK (CRITICAL)
    if (!clickid) {
      console.error("Missing clickid — skipping postback");
      return res.status(200).send("No clickid");
    }

    if (!goalId || !campaignId || !creativeId) {
      console.error("Missing campaign data — skipping postback");
      return res.status(200).send("Missing campaign data");
    }

    // Build URL
    const params = new URLSearchParams();
    params.set("clickid", clickid);
    params.set("transaction_id", transactionId);
    params.set("payout", String(amount ?? "0"));
    params.set("currency", currency || "INR");
    params.set("goal_id", goalId);
    params.set("campaign_id", campaignId);
    params.set("creative_id", creativeId);

    const baseUrl =
      process.env.WISHLINK_POSTBACK_URL || "https://wishlink.com/postback";

    const postbackUrl = `${baseUrl}?${params.toString()}`;

    console.log("📤 Sending Wishlink postback:", {
      clickid,
      transactionId,
      amount,
      currency,
      goalId,
      campaignId,
      creativeId,
    });

    const fetchRes = await fetch(postbackUrl);

    const responseText = await fetchRes.text();

    if (!fetchRes.ok) {
      console.error("❌ Wishlink rejected:", fetchRes.status, responseText);
      return res.status(200).send("Wishlink rejected");
    }

    console.log("✅ Wishlink success:", responseText);
    res.status(200).send("OK");
  } catch (err) {
    console.error("💥 Server error:", err);
    res.status(500).send("Error");
  }
}