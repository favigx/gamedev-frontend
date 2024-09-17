import { useState } from "react";
import UserDetailsInterface from "../interface/UserDetailsInterface";

interface Props {
    setPage: (page: string) => void;
}

function Register({ setPage }: Props) {
    const [newUser, setNewUser] = useState<UserDetailsInterface>({
        username: "",
        password: "",
    });

    const [errorMessage, setErrorMessage] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");

    const registerUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        fetch("https://octopus-app-p37jg.ondigitalocean.app/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...newUser }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Användarnamnet är upptaget.");
                }
                return response.json();
            })
            .then((data) => {
                console.log("Användare lades till: ", data);
                setErrorMessage("");
                setSuccessMessage("Du är nu registrerad.");
                setTimeout(() => {
                    setPage("login");
                }, 3000);
            })
            .catch((error) => {
                console.error("Fel vid tillägning: ", error);
                setErrorMessage(error.message);
            });
    };

    return (
        <div className="register">
            <form onSubmit={registerUser}>
                <h3>Registrera</h3>
                <label>
                    Användarnamn
                    <br />
                    <input className="inputForm" type="text" required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}></input>
                </label>
                <br />
                <br />
                <label>
                    Lösenord
                    <br />
                    <input className="inputForm" type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}></input>
                </label>
                <br />
                <br />
                {errorMessage && (
                    <p style={{ fontSize: "15px" }}>
                        {errorMessage}
                        <br /> Prova ett annat namn!
                    </p>
                )}
                {successMessage && (
                    <p style={{ fontSize: "15px" }}>
                        {successMessage}
                        <br /> Omdirigeras till login om 3 sek...
                    </p>
                )}
                <button className="button" type="submit">
                    Registrera ny användare
                </button>
            </form>
        </div>
    );
}

export default Register;
