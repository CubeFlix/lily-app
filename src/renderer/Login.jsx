import { useState } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';

export default function Login({ setGlobalUsername, setLoggedIn, setConnected, name }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");

    const handleSubmit = function(e) {
      e.preventDefault();
      setError("Logging in...");
      window.api.login(username, password).then((resp) => {
        if (!resp.ok) {
          setError(resp.error.toString());
        } else {
          setGlobalUsername(username);
          setLoggedIn(true);
        }
      });
    }

    const handleBack = function(e) {
      e.preventDefault();
      setError("Disconnecting...");
      window.api.disconnect().then((resp) => {
        setConnected(false);
      });
    }
    
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{height: '100vh'}}>
      <Card style={{borderRadius: '1rem', width: '400px'}}>
      <Card.Header as="h4" style={{textAlign: 'center'}}>Login to {name}</Card.Header>
      <Form onSubmit={handleSubmit} style={{padding: '20px'}}>
        <Form.Group className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control type="text" required onChange={e => setUsername(e.target.value)}/>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" required onChange={e => setPassword(e.target.value)}/>
        </Form.Group>
        <Form.Group className="mb-3" style={{textAlign: 'center'}}>
          <Button variant="secondary" style={{width: '45%', marginRight: '5px'}} onClick={handleBack}>Back</Button>
          <Button variant="primary" type="submit" style={{width: '45%', marginLeft: '5px'}}>Login</Button>
        </Form.Group>
        <Form.Text className="text-muted">{error}</Form.Text>
      </Form>
      </Card>
    </Container>
  )
}