import { useState } from "react";
import UserDetailsInterface from "../interface/UserDetailsInterface";

interface Props {
    setPage: (page: string) => void;
    setIsLoggedIn: (loggedIn: boolean) => void;
}

function Login({ setPage, setIsLoggedIn }: Props) {
    const [newLogin, setNewLogin] = useState<UserDetailsInterface>({
        username: "",
        password: "",
    });

    const [errorMessage, setErrorMessage] = useState<string>("");

    const loginUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        fetch("http://localhost:8080/loginuser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...newLogin }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Fel användarnamn eller lösenord.");
                }
                return response.text();
            })
            .then((token) => {
                console.log("Mottagen JWT-token:", token);

                localStorage.setItem("token", token);

                setPage("showrooms");
                setIsLoggedIn(true);
            })
            .catch((error) => {
                console.error("Error logging in:", error);
                setErrorMessage(error.message);
            });
    };

    return (
        <div>
            <form onSubmit={loginUser}>
                <h3>Logga in</h3>
                <label>
                    Användarnamn
                    <br />
                    <input className="inputForm" type="text" required value={newLogin.username} onChange={(e) => setNewLogin({ ...newLogin, username: e.target.value })}></input>
                </label>
                <br />
                <br />
                <label>
                    Lösenord
                    <br />
                    <input className="inputForm" type="password" required value={newLogin.password} onChange={(e) => setNewLogin({ ...newLogin, password: e.target.value })}></input>
                </label>
                <br />
                <br />
                {errorMessage && (
                    <p style={{ fontSize: "15px", wordBreak: "break-all", whiteSpace: "normal" }}>
                        {errorMessage} <br /> Prova igen!
                    </p>
                )}
                <button className="button" type="submit">
                    Logga in
                </button>
            </form>
        </div>
    );
}

export default Login;
