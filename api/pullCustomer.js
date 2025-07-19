export default async function handler(req, res) {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: 'Missing customer access token' });
  }

  const shopifyDomain = "tuqhcs-7a.myshopify.com";
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

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

  try {
    const shopifyRes = await fetch(`https://${shopifyDomain}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken
      },
      body: JSON.stringify({ query })
    });

    const data = await shopifyRes.json();

    if (data.errors || !data.data?.customer) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    res.status(200).json(data.data.customer);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch customer data" });
  }
}
