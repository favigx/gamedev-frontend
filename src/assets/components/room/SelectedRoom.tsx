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

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decodedToken = jwtDecode<{ sub: string }>(token);
            setLoggedInUserId(decodedToken.sub);
        }
    }, []);

    useEffect(() => {
        fetch(`http://localhost:8080/room/${roomId}`)
            .then((res) => res.json())
            .then((data) => setSelectedRoom(data))
            .catch((error) => console.error("Error fetching room:", error));

        const socket = new SockJS("http://localhost:8080/websocket");
        const client = Stomp.over(socket);

        client.connect({}, () => {
            client.subscribe("/topic/joined-room-message", (message: Message) => {
                let joinedUsers = document.getElementById("joinedUsers");
                let newUser = document.createElement("p");
                newUser.innerHTML = message.body;
                joinedUsers?.appendChild(newUser);
            });
        });

        setStompClient(client);

        return () => {
            if (client) {
                client.disconnect();
            }
        };
    }, [roomId]);

    function joinRoom() {
        fetch("http://localhost:8080/user/get-user-from-username/" + loggedInUserId)
            .then((res) => res.json())
            .then((data) => {
                fetch("http://localhost:8080/room/join/" + selectedRoom?.roomId + "/" + data.userId, {
                    method: "POST",
                })
                    .then((res) => res.json())
                    .then((data) => console.log(data));

                if (stompClient) {
                    stompClient.publish({
                        destination: `/app/joined-room-message`,
                        body: loggedInUserId || "",
                    });
                }
            });
    }

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
                <div id="joinedUsers"></div>

                <strong>
                    <p id="participantsTitle">
                        <u>Deltagare:</u>
                    </p>
                </strong>
                {selectedRoom.participants.map((username) => (
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
