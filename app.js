require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON parsing middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Database connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('MONGO_URI is not defined in the environment variables');
    process.exit(1);
}

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1); // Exit the process with an error code
  });

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// User schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNo: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    resumePath: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Route to handle form submission
app.post('/resume', upload.single('resume'), [
    body('name').trim().isLength({ min: 1 }).escape(),
    body('phoneNo').trim().isLength({ min: 1 }).escape(),
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, phoneNo, email } = req.body;
    const resumePath = req.file.path;

    const newUser = new User({ name, phoneNo, email, resumePath });

    try {
        await newUser.save();
        res.status(200).send('Signup successful!');
    } catch (error) {
        res.status(500).send('Signup failed. Please try again.');
    }
});

// Route to serve resume PDF
app.get('/resume/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.sendFile(path.resolve(user.resumePath));
    } catch (error) {
        res.status(500).send('Error retrieving resume');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));