import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5000";

const socket = io(backendUrl, {
  transports: ["websocket"],
  withCredentials: true
});

export default socket;