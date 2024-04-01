const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid'); // Import uuid

const port = process.env.PORT || 8000;
const io = new Server(port, {
  cors: true,
});

const activeUsers = {};
let rooms = []; // Array to store room names
var room;


io.on("connection", (socket) => {

  console.log(`Socket Connected`, socket.id);

  socket.on("room:join", (data) => {

    const { interest, area,type } = data;

    room = rooms.find((r) => r.users.length < 2);   // Find or create a new room with UUID
    if (!room) {
    const roomId = uuidv4(); // Generate UUID for room name
    room = { name: roomId, users: [] };
    rooms.push(room);
    } 

    // Join the room
    socket.join(room.name);
    room.users.push(socket.id);
    console.log(`User ${socket.id} joined room ${room.name}`);

    activeUsers[socket.id] = room.name;
  
    io.to(socket.id).emit("room:join",{ roomName: room.name, type});  // for redirection 
    socket.to(room.name).emit("user:joined", { id: socket.id });      // Notify other users in the room
  });

// code for chat 

  socket.on('sendMessage', (data) => {
  const room = activeUsers[socket.id];
  console.log(data);
  const { text } = data;
  io.to(room).emit('message', { user: socket.id, text: text});
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Remove user from room
    const roomName = activeUsers[socket.id];
    if (roomName) {
        const index = room.users.indexOf(socket.id);
        if (index !== -1) {
            room.users.splice(index, 1);
            io.to(room).emit('message', { user: 'admin', text: `User ${socket.id} has left the room` });
            delete activeUsers[socket.id];
            // If no users left in the room, remove the room
            if (room.users.length === 0) {
                rooms = rooms.filter((r) => r.name !== room.name);
            }
        }
    } else {
        console.log('User is not associated with any room');
    }
});


// code end for chat

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

//  code for TextChat only 



});



