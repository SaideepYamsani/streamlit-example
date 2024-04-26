const router = require("express").Router();
const checkAuth = require("../Util/checkauth");
const stripe = require("stripe")(
  "sk_test_51OEOecEmpCkUstvcPQN6Ac99kxpeelJoqhc9tbXLxOX1bjSaSs4CSmtg7f8ZvQVQh0gm4pBMrjp3zjcXCdwHB3NB004n5h91oQ"
);
const {
  UserModel,
  ProductModel,
  CartModel,
  OrderModel,
  WishlistModel,
  ProductfModel,
} = require("../Models/AppModel");
const bcrypt = require("bcryptjs");
const { authenticateToken, upload } = require("../Util/utils");
// Middleware to check authentication
router.use(checkAuth);
const updateCart = async (existingCart, data) => {
  existingCart.products = data.products;
  return await existingCart.save();
};

const checkUser = (req, res, next) => {
  try {
    if (!(req.user.role === "User")) {
      throw new Error("User Not Authenticated to access this route");
    }
    next();
  } catch (e) {
    res.status(403).send(e.message);
    console.error(e);
  }
};

router.get("/rat/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const ratings = await ProductfModel.findOne({ _id: productId }).select("ratings");

    res.send({ status: "ok", ratings });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: "Internal Server Error" });
  }
});



router.post('/wishlist/:id', async (req, res) => {
  try {
    const productID = req.params.id; // Extract product ID from URL parameter
    const { userID } = req.body;

    // Check if productID is provided
    if (!productID) {
      return res.status(400).send({ message: 'ProductID is required' });
    }

    // Check if userID is provided
    if (!userID) {
      return res.status(400).send({ message: 'UserID is required' });
    }

    // Check if the product already exists in the wishlist for the given userID
    const existingWishlistItem = await WishlistModel.findOne({ userID, productID });

    if (existingWishlistItem) {
      return res.status(400).send({ message: 'Product already exists in wishlist' });
    }

    // Fetch product information from ProductModel based on product ID
    const product = await ProductModel.findById(productID);

    if (!product) {
      return res.status(404).send({ message: 'Product not found' });
    }

    // Create a new WishlistModel instance and save it with product data
    const newWishlistItem = new WishlistModel({
      userID,
      productID,
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      spice: product.spice,
      size: product.size,
    });
    await newWishlistItem.save();

    res.status(201).send({ message: 'Product added to wishlist', newWishlistItem });
  } catch (error) {
    console.error('Error adding product to wishlist:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});


router.get('/listwishlist/:userID', async (req, res) => {
  try {
    const userID = req.params.userID; // Extract user ID from URL parameter

    // Check if userID is provided
    if (!userID) {
      return res.status(400).send({ message: 'UserID is required' });
    }

    // Fetch all wishlist items for the given userID
    const wishlistItems = await WishlistModel.find({ userID });

    res.status(200).send({ wishlistItems });
  } catch (error) {
    console.error('Error fetching wishlist items:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});



router.delete('/deletewishlist/:id', async (req, res) => {
  try {
    const wishlistItemId = req.params.id; // Extract item ID from URL parameter

    // Check if item ID is provided
    if (!wishlistItemId) {
      return res.status(400).send({ message: 'Item ID is required' });
    }

    // Delete the wishlist item where _id matches the provided ID
    const deletionResult = await WishlistModel.deleteOne({ _id: wishlistItemId });

    if (deletionResult.deletedCount === 0) {
      return res.status(404).send({ message: 'Wishlist item not found' });
    }

    res.status(200).send({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});


router.post('/productFb/:id', async (req, res) => {
  try {
    const productID = req.params.id; // Extract product ID from URL parameter
    const { username, des, rating } = req.body;
  
    // Check if required fields are provided
    if (!username || !des || !rating || !productID) {
      return res.status(400).send({ message: 'Username, description, rating, and productID are required' });
    }

    // Create a new ProductfModel instance
    const newProductFeedback = new ProductfModel({ productID, username, des, rating });
    await newProductFeedback.save();

    res.status(201).send({ message: 'Product feedback added successfully', newProductFeedback });
  } catch (error) {
    console.error('Error adding product feedback:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

router.get('/getProductFb/:id', async (req, res) => {
  try {
    const productID = req.params.id; // Extract product ID from URL parameter

    // Find all product feedbacks where productID matches
    const productFeedbacks = await ProductfModel.find({ productID });

    res.status(200).send({ message: 'Product feedbacks retrieved successfully', productFeedbacks });
  } catch (error) {
    console.error('Error fetching product feedbacks:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});


router.get('/getwishlist/:id', async (req, res) => {
  try {
    const userID = req.params.id; // Extract user ID from URL parameter

    // Check if the user ID is valid
    if (!mongoose.Types.ObjectId.isValid(userID)) {
      return res.status(400).send({ message: 'Invalid user ID' });
    }

    // Find all wishlist items for the given userID
    const wishlistItems = await WishlistModel.find({ userID });

    res.status(200).send({ message: 'Wishlist items fetched', wishlistItems });
  } catch (error) {
    console.error('Error fetching wishlist items:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});




router.get("/cart", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    const userCart = await CartModel.findOne({ userID });
    if (!userCart) {
      res.send({ status: "ok", message: "Empty cart" });
    } else {
      res.send(userCart);
    }
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post("/cart", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    const existingCart = await CartModel.findOne({ userID });
    let newCart;
    if (existingCart) {
      newCart = await updateCart(existingCart, req.body);
    } else {
      newCart = new CartModel({
        userID,
        products: req.body.products,
      });
      await newCart.save();
    }

    res.status(201).send({ status: "Ok", cart: newCart });
  } catch (e) {
    res.status(500).send(e);
  }
});
router.patch("/cart", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    const existingCart = await CartModel.findOne({ userID });
    const newCart = await updateCart(existingCart, req.body);
    res.status(200).send({ status: "Ok", cart: newCart });
  } catch (e) {
    res.status(500).send(e);
  }
});

router.delete("/cart", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    await CartModel.findOneAndDelete({ userID });
    res.status(200).send({ status: "Ok" });
  } catch (e) {
    res.status(500).send(e);
  }
});

router.get("/orders", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    const userOrders = await OrderModel.find({ userID });
    if (userOrders.length === 0) {
      res.send({ status: "ok", message: "No Orders" });
    } else {
      res.send(userOrders);
    }
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post("/orders", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    req.body.userID = userID;
    const newOrder = new OrderModel(req.body);
    await newOrder.save();
    res.status(201).send({ status: "Ok", order: newOrder });
  } catch (e) {
    res.status(500).send(e);
  }
});
router.patch("/orders/:id", checkUser, async (req, res) => {
  try {
    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    req.body.userID = userID;
    console.log(req.params.id);
    const changedOrder = await OrderModel.findByIdAndUpdate(
      req.params.id,
      req.body
    );
    res.status(200).send({ status: "Ok", order: changedOrder });
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

router.delete("/orders/:id", checkUser, async (req, res) => {
  try {
    await OrderModel.findByIdAndDelete(req.params.id);
    res.status(200).send({ status: "Ok" });
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post("/create-checkout-session", checkUser, async (req, res) => {
  const { cart } = req.body;
  let productsOrdered = [];

  try {
    const lineItems = await Promise.all(
      Object.entries(cart).map(async ([productId, quantity]) => {
        const product = await ProductModel.findById(productId);
        if (!product) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        productsOrdered.push({
          productID: productId,
          orderedQuantity: quantity,
          sellerId: product.seller,
        });

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
            },
            unit_amount: product.price * 100,
          },
          quantity: quantity,
        };
      })
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url:
        "http://ec2-3-21-35-199.us-east-2.compute.amazonaws.com:3000/user?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://ec2-3-21-35-199.us-east-2.compute.amazonaws.com:3000/checkout",
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
    });

    const userID = (await UserModel.findOne({ Email: req.user.email }))._id;
    try {
      const newOrder = new OrderModel({
        productsOrdered,
        userID,
        sessionId: session.id,
      });
      await newOrder.save();
    } catch (e) {
      console.log(e);
    }

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the checkout session" });
  }
});

router.get("/session-status", checkUser, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id
    );

    try {
      let Order = await OrderModel.findOne({
        sessionId: req.query.session_id,
      });
      Order.amount_subtotal = session.amount_subtotal;
      Order.currency = session.currency;
      Order.payment_intent = session.payment_intent;
      Order.payment_method_types = session.payment_method_types;
      Order.payment_status = session.payment_status;
      Order.customer_details = session.customer_details;
      Order.shipping_details = session.shipping_details;
      Order.status = session.status;

      await Order.save();
    } catch (e) {
      console.log(e);
    }

    res.send({
      status: session.status,
      customer_email: session.customer_details.email,
    });
  } catch (error) {
    console.error("Error retrieving session status:", error);
    res.status(500).send({ error: "Error retrieving session status" });
  }
});
router.get('/ratings/:pID', async (req, res) => {
  try {
    const pID = req.params.pID; // Extract product ID from URL parameter

    // Check if productID is provided
    if (!pID) {
      return res.status(400).send({ message: 'ProductID is required' });
    }

    // Fetch data for the given productID
    const productData = await ProductfModel.find({ productID: pID });

    if (!productData || productData.length === 0) {
      return res.status(404).send({ message: 'No data found for the ProductID' });
    }

    // Calculate the sum of all ratings
    const totalRatings = productData.reduce((sum, product) => {
      return sum + product.rating;
    }, 0);

    // Calculate the average rating
    const averageRating = totalRatings / productData.length;

    res.status(200).send({ averageRating });
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

router.get('/sel/:pID', async (req, res) => {
  try {
    const pID = req.params.pID; // Extract product ID from URL parameter

    // Check if productID is provided
    if (!pID) {
      return res.status(400).send({ message: 'User id required is required' });
    }

    // Fetch user data for the given _id (pID)
    const userData = await UserModel.findById(pID);

    if (!userData) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Return user data
    res.status(200).send({ userData });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});


module.exports = router;
