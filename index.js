const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid"); // Import uuid

const io = new Server(8000, {
  cors: true,
});

const activeUsers = {};
let rooms = []; // Array to store room names
var room;

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

  socket.on("room:join", (data) => {
    const { interest, area, type } = data;

    room = rooms.find((r) => r.users.length < 2); // Find or create a new room with UUID
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

    io.to(socket.id).emit("room:join", { roomName: room.name, type }); // for redirection
    socket.to(room.name).emit("user:joined", { id: socket.id }); // Notify other users in the room
  });


  // code for chat

  socket.on("sendMessage", (data) => {
    const room = activeUsers[socket.id];
    console.log(data);
    const { text } = data;
    io.to(room).emit("message", { user: socket.id, text: text });
  });
  

  socket.on('skipRoom', () => {
    let currentRoom;
    // Find the current room of the user
    rooms.forEach((room) => {
      if (room.users.includes(socket.id)) {
        currentRoom = room;
      }
    });

    // Find a room with only one user in the users array
    let newRoom;
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (room.users.length === 1 && room !== currentRoom) {
        newRoom = room;
        break;
      }
    }
     console.log(newRoom)
    if (newRoom) {
      // Leave the current room
      socket.leave(currentRoom.name);
      currentRoom.users.splice(currentRoom.users.indexOf(socket.id), 1);
      io.to(currentRoom.name).emit('message', { user: 'admin', text: "Connected User has left the room" });

      // Join the new room
      socket.join(newRoom.name);
      newRoom.users.push(socket.id);
      socket.to(room.name).emit("user:joined", { id: socket.id }); // Notify other users in the room
      console.log(`User ${socket.id} joined room ${newRoom.name}`);
    }
  });

  socket.on("exitConversation", () => {

    const roomName = activeUsers[socket.id];

    if (roomName) {
      // Iterate over the rooms array to find the room associated with the user's socket ID
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const index = room.users.indexOf(socket.id);
        if (index !== -1) {
          // Remove the user from the users array
          room.users.splice(index, 1);
          io.to(room.name).emit("message", {
            user: "admin",
            text: `Connected User has left the room`,
          });
          delete activeUsers[socket.id];
          // If no users left in the room, remove the room
          if (room.users.length === 0) {
            rooms.splice(i, 1);
          }
          break; // Exit the loop after removing the user
        }
      }
    } else {
      console.log("User is not associated with any room");
    }
  });

  socket.on("disconnect", () => {

    const roomName = activeUsers[socket.id];

    if (roomName) {
      // Iterate over the rooms array to find the room associated with the user's socket ID
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const index = room.users.indexOf(socket.id);
        if (index !== -1) {
          // Remove the user from the users array
          room.users.splice(index, 1);
          io.to(room.name).emit("message", {
            user: "admin",
            text: `Connected User has left the room`,
          });
          delete activeUsers[socket.id];
          // If no users left in the room, remove the room
          if (room.users.length === 0) {
            rooms.splice(i, 1);
          }
          break; // Exit the loop after removing the user
        }
      }
    } else {
      console.log("User is not associated with any room");
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
