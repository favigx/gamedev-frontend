import { useEffect, useState } from "react";
import RoomInterface from "../interface/RoomInterface";

function SelectedRoom({ roomId }: { roomId: string }) {
  const [selectedRoom, setSelectedRoom] =
    useState<RoomInterface | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8080/room/${roomId}`)
      .then((res) => res.json())
      .then((data) => setSelectedRoom(data))
      .catch((error) => console.error("Error fetching project:", error));
  }, [roomId]);

  if (!selectedRoom) {
    return <p>Laddar...</p>;
  }

  return (
    <>
      <div key={selectedRoom.roomId}>
        <h2>{selectedRoom.roomName}</h2>
        <strong>
          <p>
            <u>Deltagare:</u>
          </p>
        </strong>
        {selectedRoom.participants.map((username) => (
          <p key={username}>{username}</p>
        ))}

        <strong>
          <p>
            {"Skapat av: " +
              selectedRoom.createdBy}
          </p>
        </strong>
      </div>
    </>
  );
}

export default SelectedRoom;
