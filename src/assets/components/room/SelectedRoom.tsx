import { useEffect, useState } from "react";
import RoomInterface from "../interface/RoomInterface";
import { jwtDecode } from "jwt-decode";

function SelectedRoom({ roomId }: { roomId: string }) {
  const [selectedRoom, setSelectedRoom] =
    useState<RoomInterface | null>(null);
    const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (token) {
        const decodedToken = jwtDecode<{ sub: string }>(token);
        setLoggedInUserId(decodedToken.sub); 
      }
    }, []);

    function joinRoom() {
      fetch("http://localhost:8080/user/get-user-from-username/" + loggedInUserId)
      .then(res => res.json())
      .then(data => {
        console.log(selectedRoom);
        
         fetch("http://localhost:8080/room/join/" + selectedRoom?.roomId + "/" + data.userId, {
          method: "POST"
         })
         .then(res => res.json())
         .then(data => {
          console.log(data);
          
         })
        
      })
    }

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
        <button onClick={joinRoom}>Gå med</button>
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
