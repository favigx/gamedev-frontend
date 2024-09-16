interface Props {
    setPage: (page: string) => void;
    isLoggedIn: boolean;
    setIsLoggedIn: (loggedIn: boolean) => void;
}

function Navigation({ setPage, isLoggedIn, setIsLoggedIn }: Props) {
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setPage("login");
    };

    return (
        <div className="header">
            <h1>Java Quiz</h1>
            {!isLoggedIn ? (
                <>
                    <button className="button" onClick={() => setPage("register")}>
                        Registrera dig
                    </button>
                    <button className="button" onClick={() => setPage("login")}>
                        Logga in
                    </button>
                </>
            ) : (
                <>
                    <button className="button" onClick={handleLogout}>
                        Logga ut
                    </button>
                    <button className="button" onClick={() => setPage("createroom")}>
                        Skapa rum
                    </button>
                    <button className="button" onClick={() => setPage("showrooms")}>
                        Visa rum
                    </button>
                    <button className="button" onClick={() => setPage("quizrules")}>
                        Spelregler
                    </button>
                </>
            )}
        </div>
    );
}

export default Navigation;
