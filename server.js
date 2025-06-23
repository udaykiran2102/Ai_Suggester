const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_suggester'
};

// AI Tools data
const aiTools = {
  'video-summarizer': [
    {
      id: 1,
      name: 'Transvribe',
      description: 'AI-powered YouTube video transcription and summarization tool',
      url: 'https://www.transvribe.com/',
      category: 'Video',
      features: ['YouTube transcription', 'Video summarization', 'Search within videos'],
      pricing: 'Free with limitations',
      rating: 4.5
    },
    {
      id: 2,
      name: 'Mindgrasp',
      description: 'AI learning assistant that can summarize videos and create study materials',
      url: 'https://mindgrasp.ai/',
      category: 'Education',
      features: ['Video summarization', 'Note generation', 'Quiz creation'],
      pricing: 'Free tier available',
      rating: 4.3
    }
  ],
  'image-generator': [
    {
      id: 3,
      name: 'BlueWillow',
      description: 'Free AI image generator that creates stunning artwork from text prompts',
      url: 'https://www.bluewillow.ai/',
      category: 'Image',
      features: ['Text-to-image', 'Multiple art styles', 'High resolution'],
      pricing: 'Free',
      rating: 4.4
    },
    {
      id: 4,
      name: 'Leonardo.AI',
      description: 'AI-powered creative tool for generating production-quality visual assets',
      url: 'https://leonardo.ai/',
      category: 'Image',
      features: ['Image generation', 'AI Canvas', 'Real-time generation'],
      pricing: 'Free tier available',
      rating: 4.6
    }
  ],
  'code-assistant': [
    {
      id: 5,
      name: 'GitHub Copilot',
      description: 'AI pair programmer that helps you write code faster',
      url: 'https://github.com/features/copilot',
      category: 'Coding',
      features: ['Code completion', 'Multiple languages', 'Context-aware suggestions'],
      pricing: 'Free for students',
      rating: 4.7
    },
    {
      id: 6,
      name: 'Replit Ghostwriter',
      description: 'AI coding assistant integrated into Replit IDE',
      url: 'https://replit.com/site/ghostwriter',
      category: 'Coding',
      features: ['Code generation', 'Bug fixing', 'Code explanation'],
      pricing: 'Free tier available',
      rating: 4.2
    }
  ],
  'text-summarizer': [
    {
      id: 7,
      name: 'QuillBot',
      description: 'AI-powered paraphrasing and summarization tool',
      url: 'https://quillbot.com/',
      category: 'Text',
      features: ['Text summarization', 'Paraphrasing', 'Grammar checking'],
      pricing: 'Free with limitations',
      rating: 4.4
    },
    {
      id: 8,
      name: 'Smodin',
      description: 'AI writing assistant with summarization capabilities',
      url: 'https://smodin.io/',
      category: 'Text',
      features: ['Text summarization', 'Rewriting', 'Plagiarism detection'],
      pricing: 'Free tier available',
      rating: 4.1
    }
  ]
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const connection = await mysql.createConnection(dbConfig);
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      await connection.end();
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await connection.execute(
      'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [username, email, hashedPassword]
    );

    await connection.end();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const connection = await mysql.createConnection(dbConfig);
    
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await connection.end();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await connection.end();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    await connection.end();
    res.json({ 
      message: 'Login successful', 
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI tool recommendations
app.post('/api/recommend', (req, res) => {
  try {
    const { query, category } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let recommendations = [];
    const queryLower = query.toLowerCase();

    // Simple keyword matching for recommendations
    if (queryLower.includes('video') && queryLower.includes('summar')) {
      recommendations = aiTools['video-summarizer'];
    } else if (queryLower.includes('image') || queryLower.includes('picture') || queryLower.includes('generate')) {
      recommendations = aiTools['image-generator'];
    } else if (queryLower.includes('code') || queryLower.includes('program')) {
      recommendations = aiTools['code-assistant'];
    } else if (queryLower.includes('text') && queryLower.includes('summar')) {
      recommendations = aiTools['text-summarizer'];
    } else {
      // Return a mix of popular tools
      recommendations = [
        ...aiTools['video-summarizer'].slice(0, 1),
        ...aiTools['image-generator'].slice(0, 1),
        ...aiTools['code-assistant'].slice(0, 1),
        ...aiTools['text-summarizer'].slice(0, 1)
      ];
    }

    res.json({ 
      query,
      recommendations,
      total: recommendations.length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = [
    { id: 'coding', name: 'Coding', icon: '💻', description: 'AI tools for programming and development' },
    { id: 'education', name: 'Education', icon: '📚', description: 'Learning and educational AI tools' },
    { id: 'image', name: 'Image', icon: '🖼️', description: 'AI image generation and editing tools' },
    { id: 'video', name: 'Video', icon: '🎬', description: 'Video processing and editing AI tools' },
    { id: 'text', name: 'Text', icon: '📝', description: 'Text processing and writing AI tools' },
    { id: 'audio', name: 'Audio', icon: '🎵', description: 'Audio processing and generation tools' },
    { id: 'travel', name: 'Travel', icon: '✈️', description: 'AI tools for travel planning' },
    { id: 'health', name: 'Health', icon: '💊', description: 'Health and wellness AI tools' },
    { id: 'fashion', name: 'Fashion', icon: '👗', description: 'Fashion and style AI tools' },
    { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Gaming and entertainment AI tools' },
    { id: 'hr', name: 'Human Resources', icon: '👔', description: 'HR and recruitment AI tools' },
    { id: 'startup', name: 'Startup', icon: '🚀', description: 'AI tools for startups and business' }
  ];
  
  res.json(categories);
});

// Save user search history
app.post('/api/search-history', authenticateToken, async (req, res) => {
  try {
    const { query, category, results_count } = req.body;
    const userId = req.user.userId;

    const connection = await mysql.createConnection(dbConfig);
    
    await connection.execute(
      'INSERT INTO search_history (user_id, query, category, results_count, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, query, category || null, results_count || 0]
    );

    await connection.end();
    res.json({ message: 'Search history saved' });
  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user search history
app.get('/api/search-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const connection = await mysql.createConnection(dbConfig);
    
    const [history] = await connection.execute(
      'SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    await connection.end();
    res.json(history);
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.execute(`USE ${dbConfig.database}`);

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create search history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        query TEXT NOT NULL,
        category VARCHAR(50),
        results_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.end();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDatabase();
});