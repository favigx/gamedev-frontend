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
  const [nextQuestionTime, setNextQuestionTime] = useState<number>(0);
  const [answerUpdates, setAnswerUpdates] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questionDisplayTime, setQuestionDisplayTime] = useState<number | null>(null);
  const [userScores, setUserScores] = useState<Record<string, number>>({});
  const [currentQuestionScores, setCurrentQuestionScores] = useState<Record<string, number>>({});
  const [showScores, setShowScores] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [totalScores, setTotalScores] = useState<Record<string, number>>({});

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
          setCurrentQuestionScores((prevScores) => ({
            ...prevScores,
            [username]: (prevScores[username] || 0) + score,
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
  }, [roomId]);

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

              setShowScores(true);
              setNextQuestionTime(15);
              setHasAnswered(true); 

              const nextQuestionInterval = setInterval(() => {
                setNextQuestionTime((prevNextTime) => {
                  if (prevNextTime <= 1) {
                    clearInterval(nextQuestionInterval);

                    if (currentQuestionIndex < questions.length - 1) {
                      setUserScores((prevScores) => ({
                        ...prevScores,
                        ...currentQuestionScores,
                      }));
                      setTotalScores((prevScores) => {
                        const updatedScores = { ...prevScores };
                        for (const [username, score] of Object.entries(currentQuestionScores)) {
                          updatedScores[username] = (updatedScores[username] || 0) + score;
                        }
                        return updatedScores;
                      });
                      setCurrentQuestionScores({}); 
                      setCurrentQuestionIndex((prevIndex) => {
                        const nextIndex = prevIndex + 1;
                        setHasAnswered(false);
                        setAnswerUpdates([]);
                        setQuestionDisplayTime(Date.now() / 1000);
                        setShowScores(false); 
                        return nextIndex;
                      });
                      setTimeRemaining(15);
                    } else {
                      setTimeRemaining(0); 
                    }
                    return 0;
                  }
                  return prevNextTime - 1;
                });
              }, 1000);

              return 0; 
            }
            return prevTime - 1;
          });
        }, 1000);

        return () => clearInterval(intervalId);
      };

      handleTimer();
    }
  }, [questions, currentQuestionIndex]);

  useEffect(() => {
    if (loggedInUserId && showScores) {
      console.log("SCORES>>>>>>", JSON.stringify(userScores, null, 2));
    }
  }, [userScores, loggedInUserId, showScores]);

  function renderScore(listOfScores: Record<string, number>) {
    const displayScoreDiv = document.getElementById("displayScoreDiv");
    const currentQuestionScoreDiv = document.getElementById("currentQuestionScoreDiv");

    if (displayScoreDiv) {
      displayScoreDiv.innerHTML = '';

      for (const [username, score] of Object.entries(listOfScores)) {
        const userPoints = document.createElement("h4");
        userPoints.innerHTML = `${username} poäng: ${score}`;

        displayScoreDiv.appendChild(userPoints);
      }
    }

    if (currentQuestionScoreDiv) {
      currentQuestionScoreDiv.innerHTML = '';

      for (const [username, score] of Object.entries(currentQuestionScores)) {
        const userPoints = document.createElement("h4");
        userPoints.innerHTML = `${username} poäng för denna fråga: ${score}`;

        currentQuestionScoreDiv.appendChild(userPoints);
      }
    }
  }

  function startQuiz() {
    if (stompClient) {
      stompClient.publish({
        destination: `/app/start-quiz/${roomId}`,
        body: JSON.stringify(numQuestions),
      });
    }
  }

  function handleAnswerClick(questionId: string, answer: string) {
    if (hasAnswered) {
      console.log("You have already answered this question.");
      return;
    }
  
    if (questionDisplayTime) {
      const timeTaken = Date.now() / 1000 - questionDisplayTime;
      const formattedTimeTaken = timeTaken.toFixed(1);
      console.log(`Time taken to answer: ${formattedTimeTaken} seconds`);
  
      stompClient?.publish({
        destination: `/app/calculate-points`,
        body: JSON.stringify({
          questionId: questionId,
          answer: answer,
          username: loggedInUserId,
          timeToAnswer: timeTaken,
        }),
      });
    }
  
    stompClient?.publish({
      destination: `/app/answer-choice`,
      body: JSON.stringify({
        username: loggedInUserId,
        questionId: questionId,
        answer: answer
      }),
    });
  
    stompClient?.publish({
      destination: `/app/has-answered`,
      body: JSON.stringify(loggedInUserId),
    });
  
    setSelectedAnswer(answer); 
    setHasAnswered(true);
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
      
      {showScores ? (
        <div>
          <div id="currentQuestionScoreDiv">
            {Object.entries(currentQuestionScores).map(([username, score]) => (
              <p key={username}>{username}: {score} poäng</p>
            ))}
          </div>
          <p>Nästa fråga om: {nextQuestionTime} sekunder</p>
          <div id="totalScoreDiv">
            {Object.entries(totalScores).map(([username, score]) => (
              <p key={username}>{username}: {score} total poäng</p>
            ))}
          </div>
        </div>
      ) : (
        <>
          {currentQuestion ? (
            <div>
              <h2>{timeRemaining} sekunder kvar</h2>
              <p><strong>{currentQuestion.question}</strong></p>
              <div>
                {currentQuestion.answers.map((answer, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      handleAnswerClick(currentQuestion.questionId, answer)
                    }
                    disabled={hasAnswered}
                    style={{
                      backgroundColor: selectedAnswer === answer ? 'white' : 'initial',
                    }}
                  >
                    {answer}
                  </button>
                ))}
              </div>
              <div>
                {answerUpdates.map((update, index) => (
                  <p key={index}>{update}</p>
                ))}
              </div>
            </div>
          ) : (
            <p></p>
          )}
        </>
      )}
    </>
  );
}

export default Quiz;