import { useCallback, useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { over, Client, Message } from 'stompjs';

interface Room {
    roomId: string;
    roomName: string;
    createdBy: string;
    participants: string[];
}

const ShowRooms = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [stompClient, setStompClient] = useState<Client | null>(null);

    const handleMessage = useCallback((message: Message) => {
        if (message.body) {
            try {
                const roomsData: Room[] = JSON.parse(message.body);
                setRooms(roomsData);
            } catch (error) {
                console.error('Error parsing rooms data:', error);
            }
        }
    }, []);

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/websocket');
        const client = over(socket);
    
        client.connect({}, (frame) => {
            console.log('Connected: ' + frame);
    
   
            client.subscribe('/topic/rooms', handleMessage);
    
        
            client.send('/app/getrooms', {}, ''); 
    

            setStompClient(client);
        });
    
 
        return () => {
            if (stompClient) {
                stompClient.disconnect(() => {
                    console.log('Disconnected');
                });
            }
        };
    }, [handleMessage]); 

    return (
        <div id="rooms-container">
            {rooms.length === 0 ? (
                <p>No rooms available.</p>
            ) : (
                rooms.map((room) => (
                    <button>
                    <div key={room.roomId} className="room-container">
                        <div className="room-name">Room Name: {room.roomName || 'N/A'}</div>
                        <div className="created-by">Created By: {room.createdBy || 'Unknown'}</div>
                        <div className="participants">
                            Participants: {room.participants.length ? room.participants.join(', ') : 'None'}
                        </div>
                        
                    </div>
                    </button>
                ))
            )}
        </div>
    );
};

export default ShowRooms;