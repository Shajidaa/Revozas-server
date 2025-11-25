const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xodph41.mongodb.net/?appName=Cluster0`;

//middle ware
app.use(cors());
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

    app.get("/product-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // my product api

    app.get("/create-product", async (req, res) => {
      const query = {};
      const cursor = myProductsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.delete("/my-product/:id", async (res, req) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await myProductsCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
