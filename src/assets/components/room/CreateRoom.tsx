import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import NewRoomInterface from "../interface/NewRoomInterface";
import SockJS from "sockjs-client";
import { over, Client } from "stompjs";

interface Props {
    setPage: (page: string) => void;
}

function CreateRoom({ setPage }: Props) {
    const [newRoom, setNewRoom] = useState<NewRoomInterface>({
        roomName: "",
    });
    const [stompClient, setStompClient] = useState<Client | null>(null);

    useEffect(() => {
        const socket = new SockJS("https://octopus-app-p37jg.ondigitalocean.app/websocket");
        const client = over(socket);

        client.connect({}, (frame) => {
            console.log("Connected: " + frame);
            setStompClient(client);
        });

        return () => {
            if (stompClient) {
                stompClient.disconnect(() => {
                    console.log("Disconnected");
                });
            }
        };
    }, []);

    const saveRoom = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const token = localStorage.getItem("token") || "";
        const decodedToken = jwtDecode(token);
        const loggedInUser = decodedToken.sub;

        fetch(`https://octopus-app-p37jg.ondigitalocean.app/room/${loggedInUser}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                ...newRoom,
                createdBy: loggedInUser,
            }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Kunde inte spara rummet!");
                }
                setPage("home");
                setNewRoom({
                    roomName: "",
                });

                if (stompClient) {
                    stompClient.send("/app/getrooms", {}, "");
                }
            })
            .catch((error) => {
                console.error("Error saving room:", error);
            });
    };

    return (
        <div>
            <form onSubmit={saveRoom}>
                <h3>Nytt rum</h3>
                <label>
                    Namn:
                    <br />
                    <input className="inputForm" type="text" required size={30} value={newRoom.roomName} onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })} />
                </label>
                <br />
                <br />
                <button className="button" type="submit">
                    Skapa rum
                </button>
            </form>
        </div>
    );
}

export default CreateRoom;
