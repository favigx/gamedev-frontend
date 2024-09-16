import { useEffect, useState } from "react";
import RoomInterface from "../interface/RoomInterface";
import { jwtDecode } from "jwt-decode";
import { Client, Message, Stomp } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import Quiz from "../quiz/Quiz";

function SelectedRoom({ roomId }: { roomId: string }) {
    const [selectedRoom, setSelectedRoom] = useState<RoomInterface | null>(null);
    const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [joinedUsers, setJoinedUsers] = useState<string[]>([]);

    useEffect(() => {
        // Fetch token and decode it
        const token = localStorage.getItem("token");
        if (token) {
            const decodedToken = jwtDecode<{ sub: string }>(token);
            setLoggedInUserId(decodedToken.sub);
        }
    }, []);

    useEffect(() => {
        // Fetch room details
        fetch(`http://localhost:8080/room/${roomId}`)
            .then((res) => res.json())
            .then((data) => setSelectedRoom(data))
            .catch((error) => console.error("Error fetching room:", error));
        
        // Connect to WebSocket
        const socket = new SockJS("http://localhost:8080/websocket");
        const client = Stomp.over(socket);

        client.connect({}, () => {
            // Subscribe to room-specific messages
            const joinedRoomTopic = `/topic/room/${roomId}/joined-room-message`;
            client.subscribe(joinedRoomTopic, (message: Message) => {
                const username = message.body;
                // Add new user to the list
                setJoinedUsers((prevUsers) => [...prevUsers, username]);
            });

            // Publish a message indicating the user has joined the room
            if (loggedInUserId) {
                const joinRoomDestination = `/app/room/${roomId}/joined-room-message`;
                client.publish({
                    destination: joinRoomDestination,
                    body: loggedInUserId,
                });
            }
        });

        setStompClient(client);

        return () => {
            if (client) {
                client.disconnect();
            }
        };
    }, [roomId, loggedInUserId]);

    if (!selectedRoom) {
        return <p>Laddar...</p>;
    }

    return (
        <>
            <div key={selectedRoom.roomId}>
                <h2>{selectedRoom.roomName}</h2>
                <strong>
                    <p>{"Skapat av: " + selectedRoom.createdBy}</p>
                </strong>

                <strong>
                    <p id="participantsTitle">
                        <u>Deltagare:</u>
                    </p>
                </strong>
                {joinedUsers.map((username) => (
                    <p className="participants" key={username}>
                        {username}
                    </p>
                ))}

                <div>
                    <Quiz roomId={roomId} />
                </div>
            </div>
        </>
    );
}

export default SelectedRoom;