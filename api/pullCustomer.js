export default async function handler(req, res) {
  try {
    const token = req.query.token;

    console.log("🛠️ Customer Access Token received:", token);

    if (!token) {
      console.error("❌ No token provided");
      return res.status(400).json({ error: "Missing customer token" });
    }

    const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
    if (!storefrontToken) {
      console.error("❌ Missing Storefront API token in environment");
      return res.status(500).json({ error: "Missing Storefront API token" });
    }

    console.log("🔐 Storefront token looks valid, continuing...");

    const query = `
      query {
        customer(customerAccessToken: "${token}") {
          firstName
          lastName
          email
          phone
        }
      }
    `;

    const shopifyRes = await fetch("https://tuqhcs-7a.myshopify.com/api/2023-07/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query }),
    });

    console.log("📡 Shopify response status:", shopifyRes.status);

    const responseBody = await shopifyRes.text();
    console.log("📄 Shopify raw response body:", responseBody);

    const data = JSON.parse(responseBody);

    if (data.errors) {
      console.error("❌ Shopify returned GraphQL errors:", data.errors);
      return res.status(401).json({ error: "Invalid or expired token", details: data.errors });
    }

    if (!data.data || !data.data.customer) {
      console.error("❌ Customer not found in Shopify response");
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = data.data.customer;
    console.log("✅ Customer data retrieved:", customer);

    return res.status(200).json(customer);
  } catch (err) {
    console.error("💥 Unexpected error in handler:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
