export default async function handler(req, res) {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: "Missing customer access token" });
  }

  const shopifyToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  const query = `
    query {
      customer(customerAccessToken: "${token}") {
        firstName
        lastName
        email
        phone
        defaultAddress {
          address1
          address2
          city
          province
          country
          zip
        }
      }
    }
  `;

  const shopifyRes = await fetch("https://tuqhcs-7a.myshopify.com/api/2023-07/graphql.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": shopifyToken,
    },
    body: JSON.stringify({ query }),
  });

  const json = await shopifyRes.json();

  if (json.errors || json.data.customer === null) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  return res.status(200).json(json.data.customer);
}
