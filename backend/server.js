const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectToDatabase } = require("./database/db");
const swaggerUI = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");
const cluster = require("cluster");
const os = require("os");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { setupPrimary } = require("@socket.io/cluster-adapter");
const { getLatestData } = require("./autofetch");
// Load environment variables early
dotenv.config();
const PORT = process.env.PORT || 3000;
const HOST = process.env.DB_SERVER || '0.0.0.0';
// Cluster setup for production
if (process.env.NODE_ENV === "production" && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} is running`);

  // สร้าง Express app ไว้ใช้ร่วมกับ httpServer เพื่อ Sticky Sessions
  const app = express();

  // ใส่ middleware หรือ routes เบื้องต้นถ้าต้องการ เช่น health check
  app.get("/health", (req, res) => res.status(200).send("OK"));

  // สร้าง HTTP server ด้วย Express app
  const httpServer = http.createServer(app);

  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection",
  });

  setupPrimary();

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    setTimeout(() => cluster.fork(), 1000);
  });

  httpServer.listen(PORT, () => {
    console.log(`Primary server listening on port ${PORT}`);
  });
} else {
  // Worker process code
  const app = express();
  const port = process.env.PORT || 3000;

  // Enhanced rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and internal IPs
      return req.ip.startsWith('192.168.') ||
        req.ip.startsWith('10.') ||
        req.ip.startsWith('172.') ||
        req.path === '/health';
    }
  });

  // Security middleware with optimized settings
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "connect-src": ["'self'", "ws:", "wss:"]
      }
    },
    hsts: {
      maxAge: 63072000, // 2 years in seconds
      includeSubDomains: true,
      preload: true
    }
  }));

  app.use(compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  app.use(limiter);

  // Create HTTP server
  const server = http.createServer(app);

  // Configure Socket.IO with Redis adapter
  const io = new Server(server, {
    cors: {
      origin: [
        `http://${process.env.DB_SERVER}:5173`,
        "http://192.168.1.103:5173",
        "http://172.48.0.114:5173",
        "http://10.53.61.97:5173",
        "http://localhost:5173",
      ],
      credentials: true,
      methods: ["GET", "POST"]
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true
    },
    reconnection: true,          // เปิดใช้งานการเชื่อมต่อใหม่
    reconnectionAttempts: Infinity, // ลองเชื่อมต่อใหม่ไม่จำกัดครั้ง
    reconnectionDelay: 1000,      // เริ่มต้นดีเลย์ 1 วินาที
    reconnectionDelayMax: 5000,   // สูงสุด 5 วินาที

    pingTimeout: 30000, // Reduced from 60s to 30s
    pingInterval: 15000, // Reduced from 25s to 15s
    transports: ["websocket"],// Prefer WebSocket only for better performance
    allowEIO3: true // For Socket.IO v2 client compatibility
  });

  // In worker process, set up sticky sessions
  if (cluster.isWorker) {
    setupWorker(io);
  }

  // Enhanced Redis configuration
  const pubClient = createClient({
    socket: {
      host: '10.53.61.97',
      port: 6379,
      reconnectStrategy: retries => {
        // กำหนด retry connection ให้ถี่ขึ้น (เร็วขึ้น)
        return Math.min(retries * 50, 1000); // เริ่มที่ 50ms เพิ่มสูงสุด 1s
      },
      keepAlive: 5000, // ส่ง keep-alive ทุก 5 วินาที
      connectTimeout: 3000, // timeout 3 วิ หากเชื่อมต่อไม่ได้
      noDelay: true // ปิด TCP delay (ช่วยให้ latency ต่ำลง)
    },
    disableClientInfo: true
  });

  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient, {
        requestsTimeout: 5000,
        publishOnSpecificResponseChannel: true
      }));
      console.log("✅ Redis adapter connected");
    })


    .catch((err) => {
      console.error("❌ Redis connection error:", err);
      process.exit(1);
    });

  app.set("io", io);

  // Optimized CORS middleware
  app.use(cors({
    origin: (origin, callback) => {

      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        // "http://127.0.0.1:5173",
        // "http://172.48.0.114:5173",
        "http://10.53.61.97:5173",
        `http://${process.env.DB_SERVER}:5173`
      ];

      const isAllowed = allowedOrigins.includes(origin) ||
        /^(http:\/\/)?(10\.10\.\d+\.\d+|192\.168\.\d+\.\d+|172\.48\.\d+\.\d+)/.test(origin);

      callback(null, isAllowed);
    },
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200 // For legacy browser support
  }));

  // Body parsing middleware with size limits
  app.use(express.json({ limit: "5mb" })); // Reduced from 10mb
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // Connect to database
  connectToDatabase()
    .then(() => console.log("Database connection successful"))
    .catch((error) => {
      console.error("Database connection failed", error);
      process.exit(1);
    });

  // Cache control middleware
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, max-age=0");
    next();
  });

  // Import routes
  const OvenRoutes = require("./routes/OvenRoutes")(io);
  const RawmatRoutes = require("./routes/RawmatRoutes");
  const UserRoutes = require("./routes/UserRoutes");
  const ProductionRoutes = require("./routes/ProductionRoutes");
  const ProcessRoutes = require("./routes/ProcessRoutes");
  const TrolleyRoutes = require("./routes/TrolleyRoutes");
  const WorkplaceRoutes = require("./routes/WorkplaceRoutes");
  const PackageRoutes = require("./routes/PackageRoutes")(io);
  const PreparationRoutes = require("./routes/PreparationRoutes")(io);
  const ColdStorageRoutes = require("./routes/ColdStorageRoutes")(io);
  const HeaderRoutes = require("./routes/HeaderRoutes");
  const Routes = require("./routes/Rotes")(io);
  const QualityControlRoutes = require("./routes/QualityControlRoutes")(io);

  // Route registration
  app.use("/api", [
    OvenRoutes,
    RawmatRoutes,
    UserRoutes,
    ProductionRoutes,
    ProcessRoutes,
    TrolleyRoutes,
    WorkplaceRoutes,
    PackageRoutes,
    PreparationRoutes,
    ColdStorageRoutes,
    HeaderRoutes,
    Routes,
    QualityControlRoutes
  ]);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      worker: process.pid,
      memoryUsage: process.memoryUsage()
    });
  });

  // Swagger setup
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
        description: "PFCMv2 Document for Front-End",
      },
      servers: [{ url: `http://${process.env.DB_SERVER}:3000` }],
    },
    apis: ["./routes/*.js"],
  });

  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

  // Socket.IO connection tracking
  const activeSockets = new Map();

  // Enhanced Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log(`✅ New connection: ${socket.id}`);
    activeSockets.set(socket.id, socket);

    // Heartbeat monitoring
    let missedPings = 0;
    const heartbeatInterval = setInterval(() => {
      if (missedPings > 2) {
        console.log(`♻️ Terminating stale connection: ${socket.id}`);
        socket.disconnect(true); // Force disconnect
      }
      missedPings++;
      socket.emit("ping");
    }, 20000); // ส่ง ping ทุก 20 วินาที

    socket.on("pong", () => {
      missedPings = 0; // Reset counter
    });

    socket.on("disconnect", (reason) => {
      console.log(`⚠️ Disconnected: ${socket.id} (${reason})`);
      clearInterval(heartbeatInterval);

      // ส่ง event เพื่อแจ้ง Client ให้ reconnect ทันที
      socket.emit("force_reconnect");
    });


    // Room management
    socket.on("joinRoom", (roomName, callback) => {
      try {
        if (!roomName) throw new Error("Room name is required");

        socket.join(roomName);
        console.log(`🔗 ${socket.id} joined room: ${roomName}`);

        callback?.({ success: true, room: roomName });
      } catch (error) {
        console.error(`❌ Join room error: ${error.message}`);
        callback?.({ success: false, error: error.message });
        socket.emit("error", { event: "joinRoom", error: error.message });
      }
    });

    // Event handlers with error handling
    const handleSocketEvent = (event, handler) => {
      socket.on(event, async (data, callback) => {
        try {
          await handler(data, callback);
        } catch (error) {
          console.error(`${event} error:`, error);
          socket.emit("error", { event, error: error.message });
          callback?.({ success: false, error: error.message });
        }
      });
    };

    handleSocketEvent("updateFetch", (data) => {
      if (!data.room) throw new Error("Room name is required");

      socket.to(data.room).emit("refreshData", {
        ...data,
        updatedAt: new Date().toISOString()
      });
    });

    handleSocketEvent("updatePack", (data) => {
      if (!data.room) throw new Error("Room name is required");

      io.to(data.room).emit("refreshPack", {
        ...data,
        updatedAt: new Date().toISOString()
      });
    });

    handleSocketEvent("reserveSlot", (data) => {
      if (!data.slot_id || !data.room) throw new Error("Slot ID and Room are required");

      io.to(data.room).emit("forceRefresh");
      io.to(data.room).emit("slotUpdated", {
        slot_id: data.slot_id,
        status: "reserved",
        updatedBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    handleSocketEvent("updateSlotToNULL", (data) => {
      if (!data.slot_id || !data.room) throw new Error("Slot ID and Room are required");

      io.to(data.room).emit("slotUpdated", {
        slot_id: data.slot_id,
        status: null,
        updatedBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Cleanup on disconnect
    socket.on("disconnect", (reason) => {
      console.log(`⚠️ ${socket.id} disconnected: ${reason}`);
      clearInterval(heartbeatInterval);
      activeSockets.delete(socket.id);
      io.emit("userDisconnected", {
        userId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("pong", () => {
      missedPings = 0; // Reset missed pings counter
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // Start server in worker process
  if (!cluster.isPrimary) {
    server.listen(PORT, () => {
      // หา IP ของเครื่อง (interface ที่ไม่ใช่ loopback)
      const interfaces = os.networkInterfaces();
      let addresses = [];

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            addresses.push(iface.address);
          }
        }
      }

      console.log(`Worker ${process.pid} started on port ${PORT}`);
      console.log(`Accessible on:`);
      addresses.forEach(ip => {
        console.log(`  http://${ip}:${PORT}`);
      });
    });
  }

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    // Close all active sockets
    activeSockets.forEach(socket => socket.disconnect(true));

    // Close server
    server.close(() => {
      console.log(`Worker ${process.pid} terminated`);
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      console.error(`Worker ${process.pid} forced shutdown`);
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}