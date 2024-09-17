import { useCallback, useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { over, Client, Message } from "stompjs";
import RoomInterface from "../interface/RoomInterface";
import SelectedRoom from "./SelectedRoom";

const ShowRooms = () => {
    const [rooms, setRooms] = useState<RoomInterface[]>([]);
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

    const handleMessage = useCallback((message: Message) => {
        if (message.body) {
            try {
                const roomsData: RoomInterface[] = JSON.parse(message.body);
                setRooms(roomsData);
            } catch (error) {
                console.error("Error parsing rooms data:", error);
            }
        }
    }, []);

    useEffect(() => {
        const socket = new SockJS("https://octopus-app-p37jg.ondigitalocean.app/websocket");
        const client = over(socket);

        client.connect({}, (frame) => {
            console.log("Connected: " + frame);

            client.subscribe("/topic/rooms", handleMessage);

            client.send("/app/getrooms", {}, "");

            setStompClient(client);
        });

        return () => {
            if (stompClient) {
                stompClient.disconnect(() => {
                    console.log("Disconnected");
                });
            }
        };
    }, [handleMessage]);

    const handleRoomClick = (roomId: string) => {
        setSelectedRoomId(roomId);
    };

    return (
        <div id="rooms-container">
            {selectedRoomId ? (
                <SelectedRoom roomId={selectedRoomId} />
            ) : rooms.length === 0 ? (
                <h3>No rooms available.</h3>
            ) : (
                <div>
                    <h3>Alla rum</h3>
                    {rooms.map((room) => (
                        <button key={room.roomId} onClick={() => handleRoomClick(room.roomId)}>
                            <div className="room-container">
                                <div className="room-name">Room Name: {room.roomName || "N/A"}</div>
                                <div className="created-by">Created By: {room.createdBy || "Unknown"}</div>
                                <div className="participants">Participants: {room.participants.length ? room.participants.join(", ") : "None"}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ShowRooms;
