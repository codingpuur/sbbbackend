const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const cors = require("cors");

// Set up Express server
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect("mongodb+srv://sc5112492:OyErUwiQImLU6CLS@cluster0.2qc8biz.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: "de0baexee",
  api_key: "283323717259476",
  api_secret: "6iU9Pf0oadvGnsRR04Gg2RtSgjg",
});

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" });

// Define a schema and model for the image
const imageSchema = new mongoose.Schema({
  category: String,
  name: String,
  imageUrl: String,
});
const Image = mongoose.model("Image", imageSchema);

// Middleware for JSON parsing
app.use(express.json());

// Define the route for image uploading
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    // Upload image to Cloudinary
    console.log(req.file.path)
    const result = await cloudinary.uploader.upload(req.file.path);

    // Create a new image document in MongoDB
    const newImage = new Image({
      category: req.body.category,
      name: req.body.name,
      imageUrl: result.secure_url,
    });
    const savedImage = await newImage.save();

    // Respond with the saved image document
    res.json(savedImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

app.get("/unique/repeated/:category", async (req, res) => {
  try {
    const category = req.params.category;

    // Retrieve unique image names and URLs for the specified category
    const uniqueImages = await Image.aggregate([
      { $match: { category } },
      {
        $group: {
          _id: "$name",
          url: { $first: "$imageUrl" },
          id: { $first: "$_id" },
          category: { $first: "$category" },
        },
      },
      { $match: { _id: { $ne: null }, url: { $ne: null }, id: { $ne: null } } },
    ]);

    res.json(uniqueImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to retrieve unique repeated image names with URLs",
    });
  }
});

app.get("/images/person", async (req, res) => {
  try {
    const { category, name } = req.query;
    let filter = {};

    if (category) {
      filter.category = category;
    }
    if (name) {
      filter.name = name;
    }

    // Find images in MongoDB based on the filter
    const images = await Image.find(filter);

    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to retrieve images for the specified person and category",
    });
  }
});

app.get("/images", async (req, res) => {
  try {
    const { category, name, page, limit } = req.query;
    let filter = {};

    if (category) {
      filter.category = category;
    }
    if (name) {
      filter.name = name;
    }

    // Set default values for page and limit if not provided
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;

    // Calculate the skip count based on the page number and limit
    const skipCount = (pageNumber - 1) * pageSize;

    // Find images in MongoDB based on the filter and apply pagination
    const images = await Image.find(filter).skip(skipCount).limit(pageSize);

    // Get the total count of images for pagination metadata
    const totalCount = await Image.countDocuments(filter);

    // Calculate the total number of pages based on the total count and page size
    const totalPages = Math.ceil(totalCount / pageSize);

    // Respond with the retrieved images and pagination metadata
    res.json({
      images,
      totalPages,
      currentPage: pageNumber,
      pageSize,
      totalCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve images" });
  }
});

// Update an image
app.put("/images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name } = req.body;

    // Find the image by ID and update its category and name
    const updatedImage = await Image.findByIdAndUpdate(
      id,
      { category, name },
      { new: true }
    );

    if (!updatedImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(updatedImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update image" });
  }
});

// Delete an image
app.delete("/images/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the image by ID and delete it
    const deletedImage = await Image.findByIdAndDelete(id);

    if (!deletedImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// ...

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});