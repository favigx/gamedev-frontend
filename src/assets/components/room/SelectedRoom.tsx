import { useEffect, useState } from "react";
import RoomInterface from "../interface/RoomInterface";
import { jwtDecode } from "jwt-decode";
import { Client, Message, Stomp } from "@stomp/stompjs";
import QuestionInterface from "../interface/QuestionInterface";
import SockJS from "sockjs-client";



function SelectedRoom({ roomId }: { roomId: string }) {
  const [selectedRoom, setSelectedRoom] = useState<RoomInterface | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [questions, setQuestions] = useState<QuestionInterface[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [numQuestions, setNumQuestions] = useState<number>(5); 
  const [timeRemaining, setTimeRemaining] = useState<number>(15); 
  const [answerUpdates, setAnswerUpdates] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false); 

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
      client.subscribe(`/topic/quiz/${roomId}`, (message: Message) => {
        const quizData: QuestionInterface[] = JSON.parse(message.body);
        setQuestions(quizData);
        setCurrentQuestionIndex(0);
      });

      client.subscribe(`/topic/has-answered`, (message: Message) => {
        const answerUpdate = message.body;
        setAnswerUpdates((prevUpdates) => [...prevUpdates, answerUpdate]);
      });
    });

    setStompClient(client);

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (questions.length > 0) {
      const handleTimer = () => {
        setTimeRemaining(15); 
        const intervalId = setInterval(() => {
          setTimeRemaining((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(intervalId);
              setCurrentQuestionIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % questions.length;
                setHasAnswered(false);
                setAnswerUpdates([]);
                return nextIndex;
              });
              return 15; 
            }
            return prevTime - 1;
          });
        }, 1000);

        return () => clearInterval(intervalId);
      };

      handleTimer();
    }
  }, [questions, currentQuestionIndex]);

  function joinRoom() {
    fetch("http://localhost:8080/user/get-user-from-username/" + loggedInUserId)
      .then(res => res.json())
      .then(data => {
        fetch("http://localhost:8080/room/join/" + selectedRoom?.roomId + "/" + data.userId, {
          method: "POST"
        })
        .then(res => res.json())
        .then(data => console.log(data));
      });
  }

  function startQuiz() {
    if (stompClient) {
      stompClient.publish({
        destination: `/app/start-quiz/${roomId}`,
        body: JSON.stringify(numQuestions) 
      });
    }
  }

  function handleAnswerClick(questionId: string, answer: string) {
    if (hasAnswered) {
      console.log("You have already answered this question.");
      return;
    }

    console.log(`Question ID: ${questionId}, Answer: ${answer}`);
    
    if (stompClient) {
      stompClient.publish({
        destination: `/app/answer-choice`,
        body: JSON.stringify({
          username: loggedInUserId,
          questionId,
          answer
        })
      });
      
      stompClient.publish({
        destination: `/app/has-answered`,
        body: JSON.stringify(loggedInUserId)
      });

      setHasAnswered(true); 
    }
  }

  if (!selectedRoom) {
    return <p>Laddar...</p>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <>
      <div key={selectedRoom.roomId}>
        <h2>{selectedRoom.roomName}</h2>
        <button onClick={joinRoom}>Gå med</button>
        <button onClick={startQuiz}>Starta Quiz</button>
        <strong>
          <p><u>Deltagare:</u></p>
        </strong>
        {selectedRoom.participants.map((username) => (
          <p key={username}>{username}</p>
        ))}
        <strong>
          <p>{"Skapat av: " + selectedRoom.createdBy}</p>
        </strong>
        <div>
          <h3>Fråga:</h3>
          {currentQuestion ? (
            <div>
              <p><strong>{currentQuestion.question}</strong></p>
              <div>
                {currentQuestion.answers.map((answer, index) => (
                  <button 
                    key={index} 
                    onClick={() => handleAnswerClick(currentQuestion.questionId, answer)}
                    disabled={hasAnswered} 
                  >
                    {answer}
                  </button>
                ))}
              </div>
              <p>Tid kvar: {timeRemaining} sekunder</p>
              <div>
                <h4>Andra deltagare som svarat:</h4>
                {answerUpdates.map((update, index) => (
                  <p key={index}>{update}</p>
                ))}
              </div>
            </div>
          ) : (
            <p>Inga frågor tillgängliga</p>
          )}
        </div>
      </div>
    </>
  );
}

export default SelectedRoom;