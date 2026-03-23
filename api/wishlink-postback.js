/**
 * Wishlink Postback Webhook - Vercel Serverless Function
 * Receives Shopify order webhook and forwards to Wishlink
 *
 * Webhook URL: https://YOUR_PROJECT.vercel.app/api/wishlink-postback
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const orderId = order.id;
    const amount = order.total_price;
    const currency = order.currency;

    const transactionId = order?.transactions?.[0]?.id || order.id;

    // From environment variables (set in Vercel dashboard)
    const goalId = process.env.WISHLINK_GOAL_ID || "YOUR_GOAL_ID";
    const campaignId = process.env.WISHLINK_CAMPAIGN_ID || "YOUR_CAMPAIGN_ID";
    const creativeId = process.env.WISHLINK_CREATIVE_ID || "YOUR_CREATIVE_ID";

    const url =
      `https://wishlink.com/postback?clickid=${orderId}` +
      `&transaction_id=${transactionId}` +
      `&payout=${amount}` +
      `&currency=${currency}` +
      `&goal_id=${goalId}` +
      `&campaign_id=${campaignId}` +
      `&creative_id=${creativeId}`;

    await fetch(url);

    console.log("Postback sent:", url);

    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
}
