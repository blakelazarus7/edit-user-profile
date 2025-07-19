export default async function handler(req, res) {
  // ✅ Allow CORS from your site
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST method allowed." });

  const { email, address1, address2, city, province, zip, country } = req.body;

  if (!email || !address1 || !city || !province || !zip || !country) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  try {
    const RECHARGE_API_KEY = process.env.RECHARGE_API_KEY;

    // 🔍 Get Recharge customer by email
    const customerRes = await fetch(`https://api.rechargeapps.com/customers?email=${encodeURIComponent(email)}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Accept": "application/json"
      }
    });
    const customerData = await customerRes.json();
    const customer = customerData?.customers?.[0];

    if (!customer || !customer.id) {
      console.error("❌ No customer found:", customerData);
      return res.status(404).json({ error: "Customer not found in Recharge" });
    }

    // 🔍 Get subscriptions
    const subRes = await fetch(`https://api.rechargeapps.com/subscriptions?customer_id=${customer.id}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Accept": "application/json"
      }
    });
    const subData = await subRes.json();
    const subscription = subData?.subscriptions?.[0];

    if (!subscription || !subscription.id) {
      console.error("❌ No subscription found:", subData);
      return res.status(404).json({ error: "No subscription found for this customer" });
    }

    // 🔁 Update subscription address
    const updateRes = await fetch(`https://api.rechargeapps.com/subscriptions/${subscription.id}`, {
      method: "PUT",
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        address1,
        address2,
        city,
        province,
        zip,
        country
      })
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      console.error("❌ Recharge update error:", updateData);
      return res.status(400).json({ error: updateData?.error || "Recharge address update failed" });
    }

    return res.status(200).json({ success: true, recharge_subscription_updated: true });

  } catch (err) {
    console.error("❌ Recharge API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
