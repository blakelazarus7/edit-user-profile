export default async function handler(req, res) {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: 'Missing customerAccessToken' });
  }

  const shopifyRes = await fetch("https://tuqhcs-7a.myshopify.com/api/2023-07/graphql.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query: `
        query {
          customer(customerAccessToken: "${token}") {
            firstName
            lastName
            email
            phone
          }
        }
      `
    })
  });

  const result = await shopifyRes.json();

  if (!result.data || !result.data.customer) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.status(200).json(result.data.customer);
}
