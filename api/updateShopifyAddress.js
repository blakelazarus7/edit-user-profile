export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const {
      token, // Storefront customerAccessToken
      address1,
      address2,
      city,
      province,
      zip,
      country
    } = req.body;

    if (!token || !address1 || !city || !province || !zip || !country) {
      return res.status(400).json({ error: "Missing required address fields" });
    }

    const mutation = `
      mutation customerAddressUpdate($customerAccessToken: String!, $address: MailingAddressInput!) {
        customerUpdateDefaultAddress(customerAccessToken: $customerAccessToken, address: $address) {
          customer {
            defaultAddress {
              address1
              address2
              city
              province
              zip
              country
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      customerAccessToken: token,
      address: {
        address1,
        address2,
        city,
        province,
        zip,
        country
      }
    };

    const response = await fetch("https://tuqhcs-7a.myshopify.com/api/2024-04/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_API_TOKEN
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    const result = await response.json();

    if (result.errors || result.data?.customerUpdateDefaultAddress?.userErrors?.length > 0) {
      return res.status(400).json({ error: result.errors || result.data.customerUpdateDefaultAddress.userErrors });
    }

    return res.status(200).json({ success: true, address: result.data.customerUpdateDefaultAddress.customer.defaultAddress });

  } catch (err) {
    console.error("❌ Shopify address update failed:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
