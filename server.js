const express = require('express');

// My Express App
const app = express();
app.use(express.static('public'))

const socketio = require("socket.io")

const expressserver = app.listen(5000, () => console.log("Server is listening on port 5000...."))

const io = socketio(expressserver, {
    cors: true
})

// Store room occupancy 
var map = new Map();

io.on("connection", (socket) => {

    socket.on("room:join", (data) => {
        const { email, roomId } = data
        map.set(socket.id, roomId)
        io.to(roomId).emit('user:joined', { from: socket.id })
        socket.join(roomId)
        io.to(socket.id).emit("On:room:join", `My Socket ID: ${socket.id}}`)

        // console.log(map)
    });

    socket.on("user:call", ({ to, offer }) => {
        io.to(to).emit('user:call', { from: socket.id, offer })
    });

    socket.on("call:accepted", ({ ans, to }) => {
        io.to(to).emit('call:accepted', { from: socket.id, ans })
    });

    socket.on("peer:nego:needed", ({ to, offer }) => {
        io.to(to).emit('peer:nego:needed', { from: socket.id, offer })
    });

    socket.on("peer:nego:done", ({ to, ans }) => {
        io.to(to).emit('peer:nego:final', { from: socket.id, ans })
    });

    socket.on("icecandidate", ({ to, candidate }) => {
        io.to(to).emit('icecandidate', { from: socket.id, candidate })
    });

    socket.on('disconnect', () => {
        io.to(map.get(socket.id)).emit('disconnected', true)
    });

});
