const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xodph41.mongodb.net/?appName=Cluster0`;

const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// const verifyFireBaseToken = async (req, res, next) => {
//   const authorization = req.headers.authorization;
//   if (!authorization) {
//     return res.status(401).send({ message: "unauthorized access" });
//   }
//   const token = authorization.split(" ")[1];
//   console.log(token);

//   try {
//     const decoded = await admin.auth().verifyIdToken(token);

//     console.log("inside token", decoded);
//     req.token_email = decoded.email;
//     next();
//   } catch (error) {
//     console.log(error);

//     return res.status(401).send({ message: "unauthorized" });
//   }
// };
const verifyFireBaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).send({ message: "No token provided" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.token_email = decodedToken.email; // Ensure this is set
    console.log("Verified user email:", req.token_email);
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).send({ message: "Invalid token" });
  }
};
//middle ware
// app.use(cors());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello revoza!");
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const myDb = client.db("revoza_db");
    const productCollection = myDb.collection("products");
    const myProductsCollection = myDb.collection("myProducts");
    //product apis

    app.get("/products", async (req, res) => {
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    //product create

    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // latest products
    app.get("/latest-product", async (req, res) => {
      const cursor = productCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });
    // /bestSeller-product
    app.get("/bestSeller-product", async (req, res) => {
      const result = await productCollection
        .find({ bestSeller: true })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });
    app.get("/discount-product", async (req, res) => {
      try {
        const result = await productCollection
          .find({ discountPercent: { $gt: 0 } })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch discount products" });
      }
    });
    app.get("/search", async (req, res) => {
      try {
        const name = req.query.name;

        if (!name) {
          return res.status(400).send({ message: "Name query required" });
        }

        const result = await productCollection
          .find({ title: { $regex: name, $options: "i" } })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Search failed" });
      }
    });

    app.get("/products-by-category", async (req, res) => {
      try {
        const category = req.query.category;

        if (!category) {
          return res.status(400).send({ message: "Category query required" });
        }

        const result = await productCollection
          .find({ category: category })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch category products" });
      }
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // my product api

    app.post("/add-product", verifyFireBaseToken, async (req, res) => {
      try {
        const product = req.body;

        product.userEmail = req.token_email;

        const result = await myProductsCollection.insertOne(product);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add product" });
      }
    });

    app.get("/add-product", verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email; // FIXED
        if (email !== req.token_email) {
          return res.status(403).send({ message: "forbidden message" });
        }
      }
      const cursor = myProductsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/my-product/:id", verifyFireBaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const tokenEmail = req.token_email.trim().toLowerCase();

        // Use ID as string (not ObjectId)
        const query = { _id: id, userEmail: tokenEmail };

        const product = await myProductsCollection.findOne(query);

        if (!product) {
          return res
            .status(404)
            .send({ message: "Product not found or not authorized" });
        }

        const result = await myProductsCollection.deleteOne(query);
        res.send({ message: "Product deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to delete product" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
