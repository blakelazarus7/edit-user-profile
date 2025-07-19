export default async function handler(req, res) {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: 'Missing customer token' });
  }

  const STORE_DOMAIN = 'tuqhcs-7a.myshopify.com';
  const API_VERSION = '2023-07';
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

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
    const shopifyRes = await fetch(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query })
    });

    const result = await shopifyRes.json();

    if (result.errors) {
      console.error("GraphQL Error:", result.errors);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const customer = result.data.customer;

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
