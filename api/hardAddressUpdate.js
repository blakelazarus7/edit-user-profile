export default async function handler(req, res) {
  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight response
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    email,
    address1,
    address2,
    city,
    province,
    zip,
    phone,
    first_name,
    last_name,
  } = req.body;

  const rechargeToken = "sk_1x1_195a6d72ab5445ab862e1b1c36afeb23d4792ea170cd8b698a999eb8322bb81c"; // ✅ Your real token

  try {
    // 🔍 Step 1: Get customer ID
    const customerRes = await fetch(`https://api.rechargeapps.com/customers?email=${email}`, {
      headers: {
        "X-Recharge-Access-Token": rechargeToken,
        "Accept": "application/json",
      },
    });
    const customerData = await customerRes.json();
    const customer = customerData.customers?.[0];

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customerId = customer.id;

    // 🧱 Step 2: Create a new address
    const addressRes = await fetch(`https://api.rechargeapps.com/customers/${customerId}/addresses`, {
      method: "POST",
      headers: {
        "X-Recharge-Access-Token": rechargeToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        address1,
        address2,
        city,
        province,
        zip,
        country: "United States",
        first_name,
        last_name,
        phone,
      }),
    });

    const newAddressData = await addressRes.json();

    if (!newAddressData.address?.id) {
      return res.status(500).json({ error: "Failed to create new address" });
    }

    const newAddressId = newAddressData.address.id;

    // 🔄 Step 3: Assign existing subscription to the new address
    const subsRes = await fetch(`https://api.rechargeapps.com/subscriptions?email=${email}`, {
      headers: {
        "X-Recharge-Access-Token": rechargeToken,
        "Accept": "application/json",
      },
    });

    const subsData = await subsRes.json();
    const subscription = subsData.subscriptions?.[0];

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const subscriptionId = subscription.id;

    const updateSubRes = await fetch(`https://api.rechargeapps.com/subscriptions/${subscriptionId}`, {
      method: "PUT",
      headers: {
        "X-Recharge-Access-Token": rechargeToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        address_id: newAddressId,
      }),
    });

    const updatedSub = await updateSubRes.json();

    if (!updatedSub.subscription?.id) {
      return res.status(500).json({ error: "Failed to update subscription with new address" });
    }

    return res.status(200).json({
      message: "✅ Address updated and subscription reassigned successfully",
      new_address_id: newAddressId,
      subscription_id: subscriptionId,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
