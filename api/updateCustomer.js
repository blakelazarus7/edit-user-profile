export default async function handler(req, res) {
  // ✅ CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token, email, phone, firstName, lastName } = req.body;

  if (!token || !email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required customer fields' });
  }

  const mutation = `
    mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
      customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
        customer {
          firstName
          lastName
          email
          phone
        }
        customerUserErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    customerAccessToken: token,
    customer: {
      email,
      phone,
      firstName,
      lastName
    }
  };

  try {
    const shopifyRes = await fetch("https://tuqhcs-7a.myshopify.com/api/2023-07/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_API_TOKEN
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    const result = await shopifyRes.json();

    const errors = result.data?.customerUpdate?.customerUserErrors;
    if (errors && errors.length > 0) {
      return res.status(400).json({ error: errors[0].message });
    }

    const updated = result.data?.customerUpdate?.customer;
    return res.status(200).json(updated);

  } catch (err) {
    console.error("❌ Shopify update error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
