import { useEffect, useState } from "react";
import RoomInterface from "../interface/RoomInterface";
import { jwtDecode } from "jwt-decode";
import { Client, Message, Stomp } from "@stomp/stompjs";
import QuestionInterface from "../interface/QuestionInterface";
import SockJS from "sockjs-client";

function Quiz({ roomId }: { roomId: string }) {
  const [selectedRoom, setSelectedRoom] = useState<RoomInterface | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [questions, setQuestions] = useState<QuestionInterface[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(15);
  const [answerUpdates, setAnswerUpdates] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questionDisplayTime, setQuestionDisplayTime] = useState<number | null>(null);
  const [userScores, setUserScores] = useState<Record<string, number>>({});

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

      client.subscribe(`/topic/calculate-points`, (message: Message) => {

        const { score, username } = JSON.parse(message.body);

        if (username) {
          setUserScores(prevScores => ({
            ...prevScores,
            [username]: (prevScores[username] || 0) + score
          }));
        }
      });
    });

    setStompClient(client);

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [roomId, loggedInUserId]);

  useEffect(() => {
    if (loggedInUserId) {
      console.log("SCORES>>>>>>", JSON.stringify(userScores, null, 2)); 
      renderScore(userScores)
    }
  }, [userScores, loggedInUserId]);

  function renderScore(listOfScores: Record<string, number>) {
    const displayScoreDiv = document.getElementById("displayScoreDiv");
  
    if (displayScoreDiv) {
      displayScoreDiv.innerHTML = '';
  
      for (const [username, score] of Object.entries(listOfScores)) {
        const userPoints = document.createElement("h4");
        userPoints.innerHTML = `${username} poäng: ${score}`;
  
        displayScoreDiv.appendChild(userPoints);
      }
    }
  }

  useEffect(() => {
    if (questions.length > 0) {
      const handleTimer = () => {
        setTimeRemaining(15);
        if (currentQuestionIndex === 0 && questionDisplayTime === null) {
          setQuestionDisplayTime(Date.now() / 1000);
        }
        const intervalId = setInterval(() => {
          setTimeRemaining((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(intervalId);
              setCurrentQuestionIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % questions.length;
                setHasAnswered(false);
                setAnswerUpdates([]);

                setQuestionDisplayTime(Date.now() / 1000);

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

    if (questionDisplayTime) {
      const timeTaken = (Date.now() / 1000) - questionDisplayTime;
      const formattedTimeTaken = timeTaken.toFixed(1);
      console.log(`Time taken to answer: ${formattedTimeTaken} seconds`);

      stompClient?.publish({
        destination: `/app/calculate-points`,
        body: JSON.stringify({
          questionId: questionId,
          answer: answer,
          username: loggedInUserId,
          timeToAnswer: timeTaken
        })
      });
    }

    console.log(`Question ID: ${questionId}, Answer: ${answer}`);

    if (stompClient) {
      stompClient.publish({
        destination: `/app/answer-choice`,
        body: JSON.stringify({
          username: loggedInUserId,
          questionId,
          answer,
        }),
      });

      stompClient.publish({
        destination: `/app/has-answered`,
        body: JSON.stringify(loggedInUserId),
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
      <label htmlFor="numQuestions">Välj antal frågor:</label>
      <select
        id="numQuestions"
        value={numQuestions}
        onChange={(e) => setNumQuestions(Number(e.target.value))}
      >
        <option value={5}>5 frågor</option>
        <option value={10}>10 frågor</option>
      </select>

      <button onClick={startQuiz}>Starta Quiz</button>
      <div id="displayScoreDiv"></div>
      <h3>Fråga:</h3>
      {currentQuestion ? (
        <div>
          <p><strong>{currentQuestion.question}</strong></p>
          <div>
            {currentQuestion.answers.map((answer, index) => (
              <button
                key={index}
                onClick={() =>
                  handleAnswerClick(currentQuestion.questionId, answer)
                }
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
    </>
  );
}

export default Quiz;