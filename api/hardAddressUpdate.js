export default async function handler(req, res) {
  // ✅ CORS headers for Replo/frontend
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method allowed." });
  }

  const { email, address1, address2, city, province, zip, country } = req.body;

  if (!email || !address1 || !city || !province || !zip || !country) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const RECHARGE_API_TOKEN = process.env.RECHARGE_ADMIN_API;

  try {
    // 1. Get Recharge customer by email
    const customerRes = await fetch(`https://api.rechargeapps.com/customers?email=${email}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const customerData = await customerRes.json();
    const customer = customerData.customers?.[0];

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const customerId = customer.id;

    // 2. Get subscription
    const subsRes = await fetch(`https://api.rechargeapps.com/subscriptions?customer_id=${customerId}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const subsData = await subsRes.json();
    const subscription = subsData.subscriptions?.[0];

    if (!subscription) return res.status(404).json({ error: "Subscription not found" });

    const addressId = subscription.address_id;

    // 3. Update address
    const updateRes = await fetch(`https://api.rechargeapps.com/addresses/${addressId}`, {
      method: "PUT",
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address1,
        address2: address2 || "",
        city,
        province,
        zip,
        country,
      }),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      return res.status(updateRes.status).json({ error: updateData.error || "Recharge update failed" });
    }

    return res.status(200).json({ success: true, updated: updateData });
  } catch (err) {
    console.error("🔥 Recharge update failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
