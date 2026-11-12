import { WebSocket, WebSocketServer } from "ws";
import { prisma } from "db/client";

interface User {
  userId: number;
  socket: WebSocket;
}

const server = new WebSocketServer({ port: 3002 });
const ROOMS: Record<string, User[]> = {};

server.on("connection", (socket: WebSocket) => {
  socket.on("message", (data) => {
    const parsedData = JSON.parse(data.toString());

    if (parsedData.type === "join") {
      const boardId: string = parsedData.boardId;
      if (!ROOMS[boardId]) {
        ROOMS[boardId] = [];
      }
      const newUserId = Math.random();

      // Notify existing members
      ROOMS[boardId].forEach(({ socket: userSocket }) => {
        userSocket.send(
          JSON.stringify({
            type: "join",
            userId: newUserId,
          })
        );
      });

      // Add new member
      ROOMS[boardId].push({ userId: newUserId, socket });

      // Send initial state to joining member
      socket.send(
        JSON.stringify({
          type: "initial_state",
          users: ROOMS[boardId]
            .filter((x) => x.userId !== newUserId)
            .map((u) => u.userId),
        })
      );
    }
  });

  socket.on("close", () => {
    Object.entries(ROOMS).forEach(([roomId, users]) => {
      const userExists = users.find((u) => u.socket === socket);
      if (userExists) {
        // Remove user from the room
        ROOMS[roomId] = users.filter((x) => x.socket !== socket);

        // Notify remaining members
        ROOMS[roomId].forEach(({ socket: userSocket }) => {
          userSocket.send(
            JSON.stringify({
              type: "leave",
              userId: userExists.userId,
            })
          );
        });
      }
    });
  });
});