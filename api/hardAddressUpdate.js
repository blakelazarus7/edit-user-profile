export default async function handler(req, res) {
  // ✅ CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST method allowed." });

  const { email, address1, address2, city, province, zip, country } = req.body;

  if (!email || !address1 || !city || !province || !zip || !country) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const RECHARGE_API_KEY = process.env.RECHARGE_API_KEY;

    // Step 1: Lookup Recharge customer by email
    const customerRes = await fetch(`https://api.rechargeapps.com/customers?email=${email}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Accept": "application/json",
      }
    });

    const customerData = await customerRes.json();
    const customer = customerData?.customers?.[0];

    if (!customer) {
      return res.status(404).json({ error: "Customer not found in Recharge." });
    }

    // Step 2: Create a new address under this customer
    const addressCreateRes = await fetch(`https://api.rechargeapps.com/customers/${customer.id}/addresses`, {
      method: "POST",
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
        country,
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        phone: customer.phone || ""
      })
    });

    const addressResult = await addressCreateRes.json();

    if (!addressCreateRes.ok) {
      return res.status(400).json({ error: addressResult?.error || "Failed to create new address in Recharge." });
    }

    const newAddressId = addressResult.address.id;

    // Step 3: Get active subscriptions
    const subRes = await fetch(`https://api.rechargeapps.com/subscriptions?customer_id=${customer.id}`, {
      headers: {
        "X-Recharge-Access-Token": RECHARGE_API_KEY,
        "Accept": "application/json",
      }
    });

    const subData = await subRes.json();
    const subscriptions = subData.subscriptions;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: "No subscriptions found for this customer." });
    }

    // Step 4: Update each subscription to use new address
    const updates = await Promise.all(subscriptions.map(sub => {
      return fetch(`https://api.rechargeapps.com/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: {
          "X-Recharge-Access-Token": RECHARGE_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ address_id: newAddressId })
      });
    }));

    return res.status(200).json({ success: true, new_address_id: newAddressId });

  } catch (err) {
    console.error("❌ Error updating Recharge address:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
