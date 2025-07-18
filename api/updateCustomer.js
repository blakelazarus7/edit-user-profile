export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { customerAccessToken, customer } = req.body;

  if (!customerAccessToken || !customer) {
    return res.status(400).json({ error: 'Missing customer data or token' });
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
    customerAccessToken,
    customer
  };

  const shopifyRes = await fetch("https://tuqhcs-7a.myshopify.com/api/2023-07/graphql.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query: mutation, variables })
  });

  const result = await shopifyRes.json();

  const errors = result.data?.customerUpdate?.customerUserErrors;
  if (errors && errors.length > 0) {
    return res.status(400).json({ error: errors[0].message });
  }

  const updated = result.data?.customerUpdate?.customer;
  res.status(200).json(updated);
}
