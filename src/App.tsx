import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import "./index.css";

const predefinedNames = [
  "Hufflepuff",
  "HarryPotter",
  "Gryffindor",
  "Slytherin",
  "Ravenclaw",
  "Hagrid",
];

interface User {
  id: string;
  name: string;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [myName, setMyName] = useState<string>("");
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [incomingFile, setIncomingFile] = useState<{
    name: string;
    size: number;
    from: string;
  } | null>(null);
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const fileChunks = useRef<Uint8Array[]>([]);

  useEffect(() => {
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      const randomName =
        predefinedNames[Math.floor(Math.random() * predefinedNames.length)];
      setMyName(randomName);
      newSocket.emit("set_name", randomName);
    });

    newSocket.on("users", (serverUsers: User[]) => {
      setUsers(serverUsers.filter((user) => user.id !== newSocket.id));
    });

    newSocket.on(
      "file_offer",
      (data: { name: string; size: number; from: string }) => {
        setIncomingFile(data);
        setShowAcceptDialog(true);
      },
    );

    newSocket.on("file_accepted", (data: { to: string }) => {
      const fileInput = document.getElementById(
        "fileInput",
      ) as HTMLInputElement;
      const file = fileInput.files?.[0];
      if (file) {
        sendFile(file, data.to);
      }
    });

    newSocket.on("file_rejected", () => {
      alert("File transfer was rejected by the recipient.");
    });

    newSocket.on(
      "file_chunk",
      (data: { chunk: ArrayBuffer; index: number; total: number }) => {
        fileChunks.current[data.index] = new Uint8Array(data.chunk);
        setTransferProgress(((data.index + 1) / data.total) * 100);

        if (data.index === data.total - 1) {
          // All chunks received, combine and download
          const blob = new Blob(fileChunks.current, {
            type: "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = incomingFile?.name || "download";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Reset state
          setTransferProgress(0);
          setShowAcceptDialog(false);
          setIncomingFile(null);
          fileChunks.current = [];
        }
      },
    );

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowFileDialog(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedUser && socket) {
      socket.emit("send_file_offer", {
        to: selectedUser.id,
        name: file.name,
        size: file.size,
      });
    }
    setShowFileDialog(false);
  };

  const sendFile = (file: File, to: string) => {
    const chunkSize = 16 * 1024; // 16 KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    const sendChunk = (index: number) => {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const reader = new FileReader();
      reader.onload = (e) => {
        socket?.emit("file_chunk", {
          to: to,
          chunk: e.target?.result,
          index: index,
          total: totalChunks,
        });

        if (index < totalChunks - 1) {
          sendChunk(index + 1);
        }
      };
      reader.readAsArrayBuffer(chunk);
    };

    sendChunk(0);
  };

  const handleAcceptFile = () => {
    if (socket && incomingFile) {
      socket.emit("accept_file", { from: incomingFile.from });
      fileChunks.current = new Array(
        Math.ceil(incomingFile.size / (16 * 1024)),
      );
    }
  };

  const handleRejectFile = () => {
    if (socket && incomingFile) {
      socket.emit("reject_file", { from: incomingFile.from });
      setShowAcceptDialog(false);
      setIncomingFile(null);
    }
  };

  return (
    <div className="gradient-background min-h-screen">
      <header className="relative z-10 flex flex-col items-center justify-center gap-1">
        <img
          className="mt-2 w-32 sm:w-32 md:w-44 lg:w-52 xl:w-60 2xl:w-64 3xl:w-72"
          src="/Logo.webp"
          alt="BlinkSend Logo"
        />
        <p className="mt-1 text-center text-sm sm:text-sm md:text-lg lg:text-lg">
          Instant, Secure, and Limitless File Sharing at the Blink of an Eye
        </p>
      </header>

      <div className="mt-8 flex flex-col items-center">
        <h2 className="mb-4 text-2xl font-bold">Available Users</h2>
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => handleUserClick(user)}
            >
              {user.name}
            </li>
          ))}
        </ul>
      </div>

      {showFileDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded bg-white p-4">
            <h3 className="mb-2 text-lg font-bold">Select a file to send</h3>
            <input id="fileInput" type="file" onChange={handleFileSelect} />
            <button
              className="mt-2 rounded bg-red-500 px-4 py-2 text-white"
              onClick={() => setShowFileDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showAcceptDialog && incomingFile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded bg-white p-4">
            <h3 className="mb-2 text-lg font-bold">Incoming File</h3>
            <p>Name: {incomingFile.name}</p>
            <p>Size: {incomingFile.size} bytes</p>
            <p>
              From:{" "}
              {users.find((u) => u.id === incomingFile.from)?.name || "Unknown"}
            </p>
            {transferProgress > 0 && (
              <div className="mt-2 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2.5 rounded-full bg-blue-600"
                  style={{ width: `${transferProgress}%` }}
                ></div>
              </div>
            )}
            <div className="mt-4 flex justify-between">
              <button
                className="rounded bg-green-500 px-4 py-2 text-white"
                onClick={handleAcceptFile}
              >
                Accept
              </button>
              <button
                className="rounded bg-red-500 px-4 py-2 text-white"
                onClick={handleRejectFile}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 transform rounded bg-gray-800 px-4 py-2 text-white">
        You'll be discovered as {myName}
      </div>
    </div>
  );
}

export default App;
