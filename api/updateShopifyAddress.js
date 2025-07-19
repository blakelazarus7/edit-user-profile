export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.eatfare.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { customerAccessToken, addressId, address } = req.body;

    if (!customerAccessToken || !addressId || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const endpoint = "https://tuqhcs-7a.myshopify.com/api/2023-10/graphql.json";
    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_API_TOKEN
    };

    // STEP 1 – Update the address
    const updateMutation = `
      mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
        customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
          customerAddress {
            id
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `;

    const updateRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: updateMutation,
        variables: {
          customerAccessToken,
          id: addressId,
          address
        }
      })
    });

    const updateJson = await updateRes.json();
    const updatedId = updateJson?.data?.customerAddressUpdate?.customerAddress?.id;

    if (!updatedId) {
      return res.status(500).json({
        error: "Failed to update address",
        details: updateJson?.data?.customerAddressUpdate?.customerUserErrors || updateJson.errors,
      });
    }

    // STEP 2 – Set as default
    const defaultMutation = `
      mutation customerDefaultAddressUpdate($customerAccessToken: String!, $addressId: ID!) {
        customerDefaultAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
          customer {
            defaultAddress {
              id
            }
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `;

    const defaultRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: defaultMutation,
        variables: {
          customerAccessToken,
          addressId: updatedId
        }
      })
    });

    const defaultJson = await defaultRes.json();
    const defaultErrors = defaultJson?.data?.customerDefaultAddressUpdate?.customerUserErrors;

    if (defaultErrors?.length > 0) {
      return res.status(500).json({
        error: "Updated address but failed to set default",
        details: defaultErrors
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Shopify address update failed:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
