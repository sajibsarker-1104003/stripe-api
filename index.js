require('dotenv').config();
const express = require("express");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = 3000;

app.use(express.json());

// Create product plans using the Stripe API
app.post("/create-plans", async (req, res) => {
  try {
    //  [
    //   // Define your products here
    //   {
    //     name: "Enterprise Risk",
    //     description: "Enterprise Risk Management Software",
    //   },
    //   {
    //     name: "Project",
    //     description: "Project Management Software",
    //   },
    //   {
    //     name: "HRM",
    //     description: "Human Resource Management Software",
    //   },
    //   {
    //     name: "Garments",
    //     description: "Garments Management Software",
    //   },
    //   {
    //     name: "Environmental",
    //     description: "Environmental Management Software",
    //   },
    //   {
    //     name: "Health",
    //     description: "Health Management Software",
    //   },
    //   {
    //     name: "Vendor",
    //     description: "Vendor Management Software",
    //   },
    //   {
    //     name: "Cyber Security",
    //     description: "Cyber Security Software",
    //   },
    // ];

    const products=req.body.products;

    for (const product of products) {
      // Create the product
      const createdProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        type: "service",
      });

      // // Define the different license types and prices
      // const licenses = [
      //   { name: "Individual", users: 1, price: 50.0 },
      //   { name: "Enterprise", users: 100, price: 1000.0 },
      //   { name: "Team", users: 10, price: 300.0 },
      // ];

      const licenses=req.body.licenses;

      for (const license of licenses) {
        const data = await stripe.plans.create({
          product: createdProduct.id,
          nickname: `${product.name} - ${license.name} License`,
          currency: "usd",
          interval: "month",
          billing_scheme: "per_unit",
          usage_type: "licensed",
          amount: license.price * 100, // Amount in cents
          metadata: {
            description: product.description,
            users: license.users,
          },
        });
      }
    }

    res.json({ message: "Product plans created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating product plans" });
  }
});

// Add this route to your existing code
app.get("/products-with-plans", async (req, res) => {
  try {
    const products = await stripe.products.list();
    const productsWithPlans = [];

    for (const product of products.data) {
      const plans = await stripe.plans.list({ product: product.id });
      productsWithPlans.push({
        product,
        plans: plans.data,
      });
    }

    res.json(productsWithPlans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching product data with plans" });
  }
});

// Add a route to create a customer
app.post("/create-customer", async (req, res) => {
  try {
    // Get customer details from the request body or query parameters
    const { email, name } = req.body;

    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      // Additional parameters can be added here
    });

    // Return the created customer object in the response
    res.status(201).json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Error creating customer" });
  }
});

app.get("/get-customers", async (req, res) => {
  try {
    // Retrieve a list of all customers from Stripe
    const customers = await stripe.customers.list();

    // Return the list of customers in the response
    res.json(customers.data);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Error fetching customers" });
  }
});

// Add a route to get a customer by customer ID
app.get("/get-customer/:customerId", async (req, res) => {
  try {
    // Get the customer ID from the route parameters
    const customerId = req.params.customerId;

    // Retrieve the customer from Stripe using the customer ID
    const customer = await stripe.customers.retrieve(customerId);

    // Return the customer object in the response
    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Error fetching customer" });
  }
});

app.get("/get-customer-subscription/:customerId", async (req, res) => {
  try {
    // Get the customer ID from the route parameters
    const customerId = req.params.customerId;

    // Retrieve the customer from Stripe using the customer ID
    const customer = await stripe.customers.retrieve(customerId);

    let subscriptions = [];

    // Check if the customer has subscriptions
    if (customer.subscriptions && customer.subscriptions.data.length > 0) {
      // If the customer has subscriptions, retrieve plan IDs
      subscriptions = customer.subscriptions.data.map((subscription) => ({
        id: subscription.id,
        planId: subscription.items.data[0].plan.id, // Access plan ID directly
      }));
    }

    // Return the customer object with subscription details
    res.json({ customer, subscriptions });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Error fetching customer" });
  }
});

// Update a subscription
app.put(
  "/update-subscription/:customerId/:subscriptionId",
  async (req, res) => {
    try {
      const { customerId, subscriptionId } = req.params;

      // Retrieve the customer's subscription
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Check if the subscription belongs to the provided customer
      if (subscription.customer !== customerId) {
        return res
          .status(400)
          .json({ error: "Invalid customer ID for the subscription" });
      }

      // You can update various properties of the subscription here
      // For example, you can update the items, billing cycle, etc.
      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: "NEW_PRICE_ID", // Replace with the new price ID
            },
          ],
          // Other update options as needed
        }
      );

      res.json(updatedSubscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: "Error updating subscription" });
    }
  }
);

app.get('/get-customer-invoices/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // List all invoices for the specified customer
    const invoices = await stripe.invoices.list({
      customer: customerId,
    });

    res.json(invoices.data);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ error: 'Error fetching customer invoices' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
