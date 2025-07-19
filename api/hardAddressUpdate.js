export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Only POST method allowed." });
  }

  const { email, address1, address2, city, province, zip, country, phone, first_name, last_name } = req.body;

  if (!email || !address1 || !city || !province || !zip || !country || !first_name || !last_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const RECHARGE_API_KEY = process.env.RECHARGE_API_KEY;

  // Step 1: Get the customer
  const customerRes = await fetch(`https://api.rechargeapps.com/customers?email=${email}`, {
    headers: {
      "X-Recharge-Access-Token": RECHARGE_API_KEY,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  });

  const customerData = await customerRes.json();
  if (!customerData.customers || customerData.customers.length === 0) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const customerId = customerData.customers[0].id;

  // Step 2: Create new address
  const addressRes = await fetch(`https://api.rechargeapps.com/customers/${customerId}/addresses`, {
    method: "POST",
    headers: {
      "X-Recharge-Access-Token": RECHARGE_API_KEY,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address1,
      address2,
      city,
      province,
      zip,
      country,
      phone,
      first_name,
      last_name,
    }),
  });

  const addressData = await addressRes.json();

  if (!addressRes.ok) {
    return res.status(500).json({ error: "Failed to create address", details: addressData });
  }

  const newAddressId = addressData.address.id;

  // Step 3: Get subscriptions
  const subsRes = await fetch(`https://api.rechargeapps.com/subscriptions?customer_id=${customerId}`, {
    headers: {
      "X-Recharge-Access-Token": RECHARGE_API_KEY,
      "Accept": "application/json",
    },
  });

  const subsData = await subsRes.json();
  if (!subsData.subscriptions || subsData.subscriptions.length === 0) {
    return res.status(404).json({ error: "No subscriptions found" });
  }

  const activeSub = subsData.subscriptions.find(sub => sub.status === "ACTIVE");
  if (!activeSub) {
    return res.status(404).json({ error: "No active subscription found" });
  }

  const subscriptionId = activeSub.id;

  // Step 4: Update subscription to point to new address
  const updateRes = await fetch(`https://api.rechargeapps.com/subscriptions/${subscriptionId}`, {
    method: "PUT",
    headers: {
      "X-Recharge-Access-Token": RECHARGE_API_KEY,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address_id: newAddressId }),
  });

  const updateData = await updateRes.json();

  if (!updateRes.ok) {
    return res.status(500).json({ error: "Failed to update subscription", details: updateData });
  }

  // ✅ Done
  return res.status(200).json({
    success: true,
    new_address_id: newAddressId,
    subscription_updated: true,
    subscription_response: updateData,
  });
}
