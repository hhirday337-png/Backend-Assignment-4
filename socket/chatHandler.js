const jwt = require('jsonwebtoken');
const appEmitter = require('../events/appEmitter');

function extractSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return socket.handshake.query?.token || null;
}

function registerChatHandlers(io) {
  io.use((socket, next) => {
    const token = extractSocketToken(socket);
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`\x1b[32mUser connected: ${socket.id}\x1b[0m`);

    const handleJoinRoom = (roomName = 'general') => {
      const room = typeof roomName === 'string' && roomName.trim() ? roomName.trim() : 'general';
      socket.join(room);
      console.log(`${socket.id} joined room ${room}`);

      socket.to(room).emit('systemMessage', {
        room,
        message: `${socket.user.username} joined ${room}`,
        timestamp: new Date().toISOString(),
      });
    };

    socket.on('joinRoom', handleJoinRoom);
    socket.on('join_room', handleJoinRoom);

    const handleChatMessage = (payload) => {
      const data = typeof payload === 'string' ? { message: payload } : payload || {};
      const room = data.room && data.room.trim() ? data.room.trim() : 'general';
      const message = (data.message || '').trim();
      const sender = socket.user?.username || data.username || 'Anonymous';

      if (!message) return;

      console.log(`\x1b[36m[${room}] ${sender}: ${message}\x1b[0m`);

      const outbound = {
        room,
        sender,
        userId: socket.user.id,
        message,
        timestamp: new Date().toISOString(),
      };

      io.to(room).emit('chatMessage', outbound);

      appEmitter.emit('chat:message', {
        room,
        sender,
        message,
      });
    };

    socket.on('chatMessage', handleChatMessage);
    socket.on('sendMessage', handleChatMessage);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerChatHandlers;
