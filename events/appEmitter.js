const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}

const appEmitter = new AppEmitter();

appEmitter.on('user:signup', ({ id, username, email, role }) => {
  console.log(`[event] User registered -> ${username} (${email}) [role: ${role}, id: ${id}]`);
});

appEmitter.on('user:login', ({ id, username, email }) => {
  console.log(`[event] User logged in -> ${username} (${email}) [id: ${id}]`);
});

appEmitter.on('note:created', ({ noteId, title, owner }) => {
  console.log(`[event] Note created -> "${title}" [id: ${noteId}, owner: ${owner}]`);
});

appEmitter.on('note:updated', ({ noteId, title, updatedBy }) => {
  console.log(`[event] Note updated -> "${title}" [id: ${noteId}, by: ${updatedBy}]`);
});

appEmitter.on('note:deleted', ({ noteId, deletedBy }) => {
  console.log(`[event] Note deleted -> [id: ${noteId}, by: ${deletedBy}]`);
});

const chatHistory = [];

appEmitter.on('chat:message', ({ room, sender, message }) => {
  chatHistory.push({ room, sender, message, timestamp: new Date().toISOString() });
});

appEmitter.getChatHistory = () => chatHistory;

module.exports = appEmitter;
