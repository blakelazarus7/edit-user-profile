export default async function handler(req, res) {
  // ✅ Allow requests from your frontend
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const customerToken = req.query.token;
  const domain = "tuqhcs-7a.myshopify.com";
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  console.log("📦 Customer Token:", customerToken);
  console.log("🔑 Storefront API Token:", storefrontToken);

 const query = `
  query {
    customer(customerAccessToken: "${customerToken}") {
      firstName
      lastName
      email
      phone
      defaultAddress {
        address1
        address2
        city
        province
        zip
        country
      }
    }
  }
`;

  try {
    const response = await fetch(`https://${domain}/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    console.log("📥 Shopify Response:", result);

    if (result.errors) {
      return res.status(500).json({ error: result.errors });
    }

    if (!result.data?.customer) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(200).json({ customer: result.data.customer });
  } catch (err) {
    console.error("❌ Error fetching customer:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
