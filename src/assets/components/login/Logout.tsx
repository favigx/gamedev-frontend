function Logout({ setIsLoggedIn, setPage }: { setIsLoggedIn: (loggedIn: boolean) => void; setPage: (page: string) => void; }) {

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setPage("login");
    }

    return (
      <button className="button" onClick={handleLogout}>Logga ut</button>
    );
}

export default Logout;
