import { useEffect, useState } from "react";
import "./App.css";
import "../globals"

import Login from "./assets/components/login/Login";
import Register from "./assets/components/register/Register";
import Navigation from "./assets/components/navigation/Navigation";
import CreateRoom from "./assets/components/room/CreateRoom";
import ShowRooms from "./assets/components/room/ShowRooms";
import QuizRules from "./assets/components/quiz/QuizRules";

function App() {
  const [page, setPage] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedState = localStorage.getItem("isLoggedIn");
    return savedState ? JSON.parse(savedState) : false;
  });

  useEffect(() => {
    localStorage.setItem("isLoggedIn", JSON.stringify(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    let pageUrl = page;
    if (!pageUrl) {
      const queryParameters = new URLSearchParams(window.location.search);
      const getUrl = queryParameters.get("page");
      if (getUrl) {
        pageUrl = getUrl;
        setPage(getUrl);
      } else {
        pageUrl = "login";
      }
    }
    window.history.pushState(null, "", "?page=" + pageUrl);
  }, [page]);

  return (
    <>
      <Navigation setPage={setPage} isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} /> {}
      {{
        "register": <Register setPage={setPage} />,
        "login": <Login setPage={setPage} setIsLoggedIn={setIsLoggedIn} />,
        "createroom": <CreateRoom setPage={setPage}/>,
        "showrooms": <ShowRooms/>,
        "quizrules": <QuizRules/>
      }[page]}
    </>
  );
}

export default App;