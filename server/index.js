
const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const cors = require('cors');
const mqtt = require('mqtt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const dbConfig = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// Initialize database
async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Create tables if they don't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS device_readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(50) NOT NULL,
        mac_address VARCHAR(50) NOT NULL,
        alcohol_level DECIMAL(10,2) NOT NULL,
        alert_status VARCHAR(20) NOT NULL,
        index_value INT NOT NULL,
        owner_id VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_device_id (device_id),
        INDEX idx_timestamp (timestamp)
      )
    `);
    
    console.log('✅ Database connected and tables created');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// WebSocket server
const wss = new WebSocket.Server({ 
  port: WS_PORT,
  host: '0.0.0.0'
});

console.log(`🔌 WebSocket Server started on 0.0.0.0:${WS_PORT}`);
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('📱 Client connected to WebSocket');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('📱 Client disconnected from WebSocket');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// MQTT client setup
const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

const TOPICS = [
  "breath/EC64C984B1FC",
  "breath/EC64C984E8B0",
  "EC64C984E8",
  "EC64C984B1"
];

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  TOPICS.forEach(topic => mqttClient.subscribe(topic));
});

mqttClient.on('message', async (topic, payload) => {
  try {
    const data = JSON.parse(payload.toString());
    console.log('📥 MQTT Message received:', data);
    
    // Save to database
    if (pool) {
      await pool.execute(
        `INSERT INTO device_readings (device_id, mac_address, alcohol_level, alert_status, index_value, owner_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.device_id || data.MAC || 'unknown', 
          data.MAC || null, 
          data.alc_val || 0, 
          data.Alert || 'Unknown', 
          data.Index || 0, 
          data.OwnerId || null
        ]
      );
    }
    
    // Broadcast to WebSocket clients
    broadcast({
      topic,
      data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing MQTT message:', error);
  }
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/devices', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT device_id, mac_address FROM device_readings ORDER BY device_id'
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.get('/api/readings/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = req.query.limit || 30;
    
    const [rows] = await pool.execute(
      `SELECT * FROM device_readings 
       WHERE device_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [deviceId, parseInt(limit)]
    );
    
    res.json(rows.reverse()); // Return in chronological order
  } catch (error) {
    console.error('❌ Error fetching readings:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

app.get('/api/latest', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT dr1.* 
      FROM device_readings dr1
      INNER JOIN (
        SELECT device_id, MAX(timestamp) as max_timestamp
        FROM device_readings
        GROUP BY device_id
      ) dr2 ON dr1.device_id = dr2.device_id AND dr1.timestamp = dr2.max_timestamp
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching latest readings:', error);
    res.status(500).json({ error: 'Failed to fetch latest readings' });
  }
});

// Start servers
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
  });
  
  console.log(`🔌 WebSocket Server running on port ${WS_PORT}`);
}

startServer().catch(console.error);
