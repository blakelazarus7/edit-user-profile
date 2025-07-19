export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { email, address1, address2, city, province, zip, country } = req.body;

  if (!email || !address1 || !city || !province || !zip || !country) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  try {
    const RECHARGE_API_KEY = process.env.RECHARGE_API_KEY;

    // Get customer
    const customerRes = await fetch(`https://api.rechargeapps.com/customers?email=${email}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Accept": "application/json"
      }
    });
    const customerData = await customerRes.json();
    const customer = customerData.customers?.[0];

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    // Get subscriptions
    const subsRes = await fetch(`https://api.rechargeapps.com/subscriptions?customer_id=${customer.id}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Accept": "application/json"
      }
    });
    const subsData = await subsRes.json();
    const subscriptions = subsData.subscriptions;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: "No subscriptions found for this customer" });
    }

    // ✅ Update address inline on each subscription
    const results = [];
    for (const subscription of subscriptions) {
      const updateRes = await fetch(`https://api.rechargeapps.com/subscriptions/${subscription.id}`, {
        method: "PUT",
        headers: {
          "X-Recharge-Access-Token": RECHARGE_API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/json"
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

      const updateJson = await updateRes.json();

      results.push({
        subscription_id: subscription.id,
        ok: updateRes.ok,
        status: updateRes.status,
        response: updateJson
      });
    }

    return res.status(200).json({ success: true, updated: results });

  } catch (err) {
    console.error("❌ Recharge update failed:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
