import { Route, HashRouter, Routes } from 'react-router-dom';
import useLocalStorage from './useLocalStorage';
import Login from "./Login";
import Connect from "./Connect";
import NavBar from './NavBar';
import Home from './Home';
import Drive from './Drive';
import './App.css';

export default function App() {

  const [address, setAddress] = useLocalStorage("address");
  const [port, setPort] = useLocalStorage("port");
  const [allowUnauthorizedHosts, setAllowUnauthorizedHosts] = useLocalStorage("allowUnauthorizedHosts");
  const [name, setName] = useLocalStorage("name");
  const [username, setUsername] = useLocalStorage("username");
  
  const [connected, setConnected] = useLocalStorage("connected", false);
  const [loggedIn, setLoggedIn] = useLocalStorage("loggedIn", false);

  const handleLogout = function(e) {
    e.preventDefault();
    window.api.logout().then((resp) => {
      setLoggedIn(false);
    });
  }

  const handleLogoutAndDisconnect = function(e) {
    e.preventDefault();
    window.api.logout().then((resp) => {
      setLoggedIn(false);
      window.api.disconnect().then((resp) => {
        setConnected(false);
      });
    });
  }

  if (!connected) {
    return <Connect setGlobalAddress={setAddress} setGlobalPort={setPort} setGlobalAllowUnauthorizedHosts={setAllowUnauthorizedHosts} setName={setName} setConnected={setConnected}></Connect>;
  }

  if (!loggedIn) {
    return <Login setGlobalUsername={setUsername} setLoggedIn={setLoggedIn} setConnected={setConnected} name={name}></Login>;
  }

  return (
    <div>
    <HashRouter>
      <NavBar name={name} username={username} handleLogout={handleLogout} handleLogoutAndDisconnect={handleLogoutAndDisconnect}></NavBar>
      <Routes>
        <Route path="/" element={<Home name={name} username={username} setLoggedIn={setLoggedIn}></Home>} />
        <Route path="/drive/:driveName/" element={<Drive username={username} setLoggedIn={setLoggedIn}></Drive>} />
      </Routes>
    </HashRouter>
    </div>
  );
}
